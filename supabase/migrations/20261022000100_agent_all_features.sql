begin;
create or replace function private.bank_agent_prepare(p_plan_id uuid,p_index integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.sim_agent_plans%rowtype;v bigint;payload jsonb;prepared jsonb;
begin
 perform private.bank_guard(true);
 select * into r from public.sim_agent_plans where id=p_plan_id and user_id=auth.uid();
 if not found then raise exception 'PLAN_NOT_FOUND';end if;
 if r.expires_at<clock_timestamp() then raise exception 'PLAN_EXPIRED';end if;
 select version into v from public.sim_profiles where user_id=auth.uid() for update;
 if v is distinct from r.state_version then raise exception 'STALE_STATE';end if;
 if p_index<0 or p_index>=jsonb_array_length(r.plan->'actions') then raise exception 'INVALID_ACTION';end if;
 payload:=r.plan->'actions'->p_index->'payload';
 if payload->>'type' not in ('subscription','card','transfer','tuition','budget','investment') or payload->>'type' is null then raise exception 'INVALID_ACTION';end if;
 prepared:=private.sim_prepare(payload);
 insert into public.sim_audit(user_id,action_id,event,detail) values(auth.uid(),(prepared->>'id')::uuid,'agent.action.prepared',jsonb_build_object('correlationId',r.id,'index',p_index));
 return prepared;
end $$;

create or replace function private.bank_agent_execute(p_action_id uuid,p_approve boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.sim_actions%rowtype;outcome jsonb;verified boolean:=false;before_balance bigint;before_destination bigint;before_holding bigint;minor bigint;expected bigint;
begin
 perform private.bank_guard(true);
 select * into r from public.sim_actions where id=p_action_id and user_id=auth.uid() for update;
 if not found then raise exception 'ACTION_NOT_FOUND';end if;
 if not exists(select 1 from public.sim_audit where user_id=auth.uid() and action_id=r.id and event='agent.action.prepared') then raise exception 'AGENT_ACTION_REQUIRED';end if;
 if r.status<>'pending' then return coalesce(r.result,jsonb_build_object('status',r.status,'id',r.id));end if;
 if p_approve then
  perform 1 from public.sim_profiles where user_id=auth.uid() for update;
  if r.payload->>'type'='transfer' and (r.payload ? 'scheduledAt' or r.payload ? 'beneficiaryId') then raise exception 'CAPABILITY_UNAVAILABLE';end if;
  if r.payload->>'type'='investment' and r.payload->>'direction'='buy' then
   if not exists(select 1 from public.sim_products where id=(r.payload->>'productId')::uuid and user_id=auth.uid() and
    case risk when 'low' then 0 when 'medium' then 1 when 'high' then 2 else 99 end <=
    case r.payload->>'riskTolerance' when 'low' then 0 when 'medium' then 1 when 'high' then 2 else -1 end) then raise exception 'RISK_TOLERANCE_REQUIRED';end if;
  end if;
  if r.payload->>'type' in ('transfer','tuition','investment') then
   select balance_minor into before_balance from public.sim_accounts where id=(r.payload->>'sourceId')::uuid and user_id=auth.uid();
  end if;
  if r.payload->>'type'='transfer' then select balance_minor into before_destination from public.sim_accounts where id=(r.payload->>'destinationId')::uuid and user_id=auth.uid();end if;
  if r.payload->>'type'='investment' then select value_minor into before_holding from public.sim_holdings where product_id=(r.payload->>'productId')::uuid and user_id=auth.uid();end if;
 end if;
 outcome:=private.sim_execute(p_action_id,p_approve);
 if outcome->>'status'='executed' then
  if r.payload->>'type'='transfer' then
   minor:=(r.payload->>'amountMinor')::bigint;
   select count(*)=2 into verified from public.sim_ledger where user_id=auth.uid() and action_id=r.id and amount_minor=minor and
    ((account_id=(r.payload->>'sourceId')::uuid and direction='debit') or (account_id=(r.payload->>'destinationId')::uuid and direction='credit'));
   verified:=verified and exists(select 1 from public.sim_accounts where user_id=auth.uid() and id=(r.payload->>'sourceId')::uuid and balance_minor=before_balance-minor)
    and exists(select 1 from public.sim_accounts where user_id=auth.uid() and id=(r.payload->>'destinationId')::uuid and balance_minor=before_destination+minor);
  elsif r.payload->>'type'='budget' then
   select limit_minor=(r.payload->>'limitMinor')::bigint into verified from public.sim_budgets where user_id=auth.uid() and category=r.payload->>'category';
  elsif r.payload->>'type'='tuition' then
   select amount_minor into minor from public.sim_tuition where id=(r.payload->>'tuitionId')::uuid and user_id=auth.uid() and paid;
   verified:=minor is not null and exists(select 1 from public.sim_ledger where user_id=auth.uid() and action_id=r.id and direction='debit' and account_id=(r.payload->>'sourceId')::uuid and amount_minor=minor)
    and exists(select 1 from public.sim_accounts where user_id=auth.uid() and id=(r.payload->>'sourceId')::uuid and balance_minor=before_balance-minor);
  elsif r.payload->>'type'='investment' then
   minor:=(r.payload->>'amountMinor')::bigint;expected:=case r.payload->>'direction' when 'buy' then minor else -minor end;
   verified:=exists(select 1 from public.sim_holdings where user_id=auth.uid() and product_id=(r.payload->>'productId')::uuid and value_minor=coalesce(before_holding,0)+expected)
    and exists(select 1 from public.sim_accounts where user_id=auth.uid() and id=(r.payload->>'sourceId')::uuid and balance_minor=before_balance-expected)
    and exists(select 1 from public.sim_ledger where user_id=auth.uid() and action_id=r.id and account_id=(r.payload->>'sourceId')::uuid and amount_minor=minor and direction=case r.payload->>'direction' when 'buy' then 'debit' else 'credit' end);
  elsif r.payload->>'type'='subscription' then
   select not active into verified from public.sim_subscriptions where user_id=auth.uid() and id=(r.payload->>'subscriptionId')::uuid;
  elsif r.payload->>'type'='card' then
   select case r.payload->>'mode' when 'freeze' then frozen when 'unfreeze' then not frozen when 'limit' then monthly_limit_minor=(r.payload->>'limitMinor')::bigint else false end
    into verified from public.sim_cards where user_id=auth.uid() and id=(r.payload->>'cardId')::uuid;
  end if;
  if r.status='pending' then
   insert into public.sim_audit(user_id,action_id,event,detail) values(auth.uid(),r.id,'agent.action.verified',jsonb_build_object('verified',coalesce(verified,false)));
  end if;
 end if;
 outcome:=outcome||jsonb_build_object('verified',coalesce(verified,false));
 update public.sim_actions set result=outcome where id=r.id and user_id=auth.uid();
 return outcome;
end $$;

commit;
