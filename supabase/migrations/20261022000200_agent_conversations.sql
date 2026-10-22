begin;
create table public.sim_agent_conversations(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
 session_id uuid not null references auth.sessions(id) on delete cascade,state jsonb not null,revision integer not null default 0,
 expires_at timestamptz not null default (now()+interval '30 minutes')
);
create index sim_conversation_owner_session on public.sim_agent_conversations(user_id,session_id,expires_at);
create index sim_conversation_session on public.sim_agent_conversations(session_id);
alter table public.sim_agent_conversations enable row level security;
create policy owner_session_read on public.sim_agent_conversations for select to authenticated using(user_id=(select auth.uid()) and session_id=nullif((select auth.jwt())->>'session_id','')::uuid and (select private.bank_session_valid()) and expires_at>now());
revoke all on public.sim_agent_conversations from public,anon,authenticated;
grant select on public.sim_agent_conversations to authenticated;
create function private.bank_conversation_open(p_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.sim_agent_conversations%rowtype;sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid;rid uuid:=gen_random_uuid();s jsonb;
begin
 perform private.bank_guard(false);
 if p_id is null then
  delete from public.sim_agent_conversations where user_id=auth.uid() and expires_at<clock_timestamp();
  if (select count(*) from public.sim_agent_conversations where user_id=auth.uid())>=20 then raise exception 'CONVERSATION_LIMIT';end if;
  s:=jsonb_build_object('id',rid,'source','private','revision',0,'drafts','[]'::jsonb,'messages','[]'::jsonb,'expiresAt',(extract(epoch from clock_timestamp()+interval '30 minutes')*1000)::bigint);
  insert into public.sim_agent_conversations(id,user_id,session_id,state) values(rid,auth.uid(),sid,s);return s;
 end if;
 select * into r from public.sim_agent_conversations where id=p_id and user_id=auth.uid() and session_id=sid;
 if not found then raise exception 'CONVERSATION_NOT_FOUND';end if;
 if r.expires_at<clock_timestamp() then raise exception 'CONVERSATION_EXPIRED';end if;
 return r.state;
end $$;
create function private.bank_conversation_save(p_id uuid,p_revision integer,p_state jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.sim_agent_conversations%rowtype;s jsonb;
begin
 perform private.bank_guard(false);
 select * into r from public.sim_agent_conversations where id=p_id and user_id=auth.uid() and session_id=nullif(auth.jwt()->>'session_id','')::uuid for update;
 if not found then raise exception 'CONVERSATION_NOT_FOUND';end if;
 if r.expires_at<clock_timestamp() then raise exception 'CONVERSATION_EXPIRED';end if;
 if r.revision<>p_revision then raise exception 'STALE_CONVERSATION';end if;
 if octet_length(p_state::text)>100000 or p_state->>'source'<>'private' or p_state->>'id'<>p_id::text or (p_state->>'revision')::integer<>p_revision+1 or jsonb_typeof(p_state->'drafts') is distinct from 'array' or jsonb_array_length(p_state->'drafts')>20 or jsonb_typeof(p_state->'messages') is distinct from 'array' or jsonb_array_length(p_state->'messages')>40 then raise exception 'INVALID_CONVERSATION';end if;
 s:=jsonb_set(p_state,'{expiresAt}',to_jsonb((extract(epoch from clock_timestamp()+interval '30 minutes')*1000)::bigint));
 update public.sim_actions a set status='stale',decided_at=now(),result=jsonb_build_object('id',a.id,'status','stale','verified',false)
 where a.user_id=auth.uid() and a.status='pending' and exists(select 1 from public.sim_audit au join public.sim_agent_plans pl on pl.id=(au.detail->>'correlationId')::uuid and pl.user_id=auth.uid() where au.user_id=auth.uid() and au.action_id=a.id and au.event='agent.action.prepared' and pl.plan->>'conversationId'=p_id::text);
 update public.sim_agent_plans set expires_at=clock_timestamp()-interval '1 second' where user_id=auth.uid() and plan->>'conversationId'=p_id::text;
 update public.sim_agent_conversations set state=s,revision=p_revision+1,expires_at=clock_timestamp()+interval '30 minutes' where id=p_id and user_id=auth.uid();
 insert into public.sim_audit(user_id,event,detail) values(auth.uid(),'agent.conversation.updated',jsonb_build_object('conversationId',p_id,'revision',p_revision+1));return s;
end $$;
create function private.bank_conversation_prepare(p_id uuid,p_revision integer,p_task text,p_plan jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.sim_agent_conversations%rowtype;p jsonb;prepared jsonb;
begin
 perform private.bank_guard(true);
 select * into r from public.sim_agent_conversations where id=p_id and user_id=auth.uid() and session_id=nullif(auth.jwt()->>'session_id','')::uuid for update;
 if not found then raise exception 'CONVERSATION_NOT_FOUND';end if;
 if r.expires_at<clock_timestamp() then raise exception 'CONVERSATION_EXPIRED';end if;
 if r.revision<>p_revision then raise exception 'STALE_CONVERSATION';end if;
 if not exists(select 1 from jsonb_array_elements(r.state->'drafts') d where d->>'id'=p_task and d->>'status'='draft') or jsonb_array_length(p_plan->'actions')<>1 then raise exception 'INVALID_DRAFT';end if;
 p:=p_plan||jsonb_build_object('conversationId',p_id,'conversationRevision',p_revision,'taskId',p_task);
 perform private.bank_agent_store_plan(p);prepared:=private.bank_agent_prepare((p->>'id')::uuid,0);return prepared;
end $$;
create function private.bank_conversation_record(p_id uuid,p_action uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.sim_agent_conversations%rowtype;a public.sim_actions%rowtype;task text;idx integer;s jsonb;
begin
 perform private.bank_guard(false);
 select * into r from public.sim_agent_conversations where id=p_id and user_id=auth.uid() and session_id=nullif(auth.jwt()->>'session_id','')::uuid for update;
 if not found then raise exception 'CONVERSATION_NOT_FOUND';end if;
 select * into a from public.sim_actions where id=p_action and user_id=auth.uid();
 if not found or a.status='pending' then raise exception 'ACTION_NOT_DECIDED';end if;
 select pl.plan->>'taskId' into task from public.sim_audit au join public.sim_agent_plans pl on pl.id=(au.detail->>'correlationId')::uuid and pl.user_id=auth.uid() where au.user_id=auth.uid() and au.action_id=a.id and au.event='agent.action.prepared' and pl.plan->>'conversationId'=p_id::text limit 1;
 if task is null then raise exception 'CONVERSATION_ACTION_REQUIRED';end if;
 select ordinality::integer-1 into idx from jsonb_array_elements(r.state->'drafts') with ordinality d where d.value->>'id'=task;
 if idx is null then raise exception 'INVALID_DRAFT';end if;
 if r.state->'drafts'->idx->'receipt'->>'actionId'=a.id::text then return r.state;end if;
 s:=jsonb_set(r.state,array['drafts',idx::text,'status'],to_jsonb(case a.status when 'executed' then 'completed' when 'rejected' then 'rejected' else 'failed' end));
 s:=jsonb_set(s,array['drafts',idx::text,'receipt'],jsonb_build_object('actionId',a.id,'status',a.status,'verified',coalesce((a.result->>'verified')::boolean,false)));
 s:=jsonb_set(s,'{revision}',to_jsonb(r.revision+1));
 -- Saving also invalidates other prepared drafts after a banking decision.
 return private.bank_conversation_save(p_id,r.revision,s);
end $$;
revoke all on function private.bank_conversation_open(uuid),private.bank_conversation_save(uuid,integer,jsonb),private.bank_conversation_prepare(uuid,integer,text,jsonb),private.bank_conversation_record(uuid,uuid) from public,anon;
grant execute on function private.bank_conversation_open(uuid),private.bank_conversation_save(uuid,integer,jsonb),private.bank_conversation_prepare(uuid,integer,text,jsonb),private.bank_conversation_record(uuid,uuid) to authenticated;
create function public.bank_conversation_open(p_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.bank_conversation_open(p_id);$$;
create function public.bank_conversation_save(p_id uuid,p_revision integer,p_state jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.bank_conversation_save(p_id,p_revision,p_state);$$;
create function public.bank_conversation_prepare(p_id uuid,p_revision integer,p_task text,p_plan jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.bank_conversation_prepare(p_id,p_revision,p_task,p_plan);$$;
create function public.bank_conversation_record(p_id uuid,p_action uuid) returns jsonb language sql security invoker set search_path='' as $$select private.bank_conversation_record(p_id,p_action);$$;
revoke all on function public.bank_conversation_open(uuid),public.bank_conversation_save(uuid,integer,jsonb),public.bank_conversation_prepare(uuid,integer,text,jsonb),public.bank_conversation_record(uuid,uuid) from public,anon;
grant execute on function public.bank_conversation_open(uuid),public.bank_conversation_save(uuid,integer,jsonb),public.bank_conversation_prepare(uuid,integer,text,jsonb),public.bank_conversation_record(uuid,uuid) to authenticated;

-- Bind conversational actions at the shared executor.
create or replace function private.sim_execute(p_action_id uuid,p_approve boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid(); r public.sim_actions%rowtype; current_version bigint;
  kind text; minor bigint; acct public.sim_accounts%rowtype; dest public.sim_accounts%rowtype;
  target uuid; option_text text; v_result jsonb;
begin
  perform private.bank_guard(true);
  if owner is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_approve is null then raise exception 'DECISION_REQUIRED'; end if;
  select * into r from public.sim_actions where id=p_action_id and user_id=owner for update;
  if not found then raise exception 'ACTION_NOT_FOUND'; end if;
  if r.status='pending' and exists(select 1 from public.sim_audit au join public.sim_agent_plans p on p.id=(au.detail->>'correlationId')::uuid and p.user_id=owner where au.user_id=owner and au.action_id=r.id and au.event='agent.action.prepared' and p.plan ? 'conversationId')
   and not exists(select 1 from public.sim_audit au join public.sim_agent_plans p on p.id=(au.detail->>'correlationId')::uuid and p.user_id=owner join public.sim_agent_conversations c on c.id::text=p.plan->>'conversationId' and c.user_id=owner where au.user_id=owner and au.action_id=r.id and au.event='agent.action.prepared' and c.session_id=nullif(auth.jwt()->>'session_id','')::uuid and c.expires_at>clock_timestamp()) then raise exception 'CONVERSATION_SESSION_REQUIRED';end if;

  if r.status <> 'pending' then return coalesce(r.result,jsonb_build_object('status',r.status,'id',r.id)); end if;
  if clock_timestamp()>r.expires_at then
    update public.sim_actions set status='expired',decided_at=now(),result=jsonb_build_object('status','expired','id',r.id) where id=r.id and user_id=owner;
    return jsonb_build_object('status','expired','id',r.id);
  end if;
  if p_approve = false then
    update public.sim_actions set status='rejected',decided_at=now(),result=jsonb_build_object('status','rejected','id',r.id) where id=r.id and user_id=owner;
    insert into public.sim_audit(user_id,action_id,event,detail) values(owner,r.id,'action.rejected',jsonb_build_object('type',r.payload->>'type'));
    return jsonb_build_object('status','rejected','id',r.id);
  end if;
  select version into current_version from public.sim_profiles where user_id=owner for update;
  if current_version is distinct from r.state_version then
    update public.sim_actions set status='stale',decided_at=now(),result=jsonb_build_object('status','stale','id',r.id) where user_id=owner and id=r.id;
    return jsonb_build_object('status','stale','id',r.id);
  end if;
  kind := r.payload->>'type';
  if kind in ('transfer','tuition','investment') then
    option_text := r.payload->>'sourceId';
    if option_text is null then raise exception 'SOURCE_REQUIRED'; end if;
    select * into acct from public.sim_accounts where id=option_text::uuid and user_id=owner and (kind='transfer' or currency='CNY') for update;
    if not found then raise exception 'OWNED_SOURCE_REQUIRED'; end if;
  end if;
  if kind in ('transfer','investment') then
    option_text := r.payload->>'amountMinor';
    if option_text is null or option_text !~ '^[1-9][0-9]{0,10}$' then raise exception 'INVALID_AMOUNT'; end if;
    minor := option_text::bigint;
  end if;
  case kind
    when 'transfer' then
      target := (r.payload->>'destinationId')::uuid;
      if target=acct.id then raise exception 'SAME_ACCOUNT'; end if;
      select * into dest from public.sim_accounts where id=target and user_id=owner and currency=acct.currency for update;
      if not found then raise exception 'SAME_CURRENCY_OWNED_DESTINATION_REQUIRED'; end if;
      if acct.balance_minor<minor then raise exception 'INSUFFICIENT_FUNDS'; end if;
      update public.sim_accounts set balance_minor=balance_minor-minor where id=acct.id and user_id=owner;
      update public.sim_accounts set balance_minor=balance_minor+minor where id=dest.id and user_id=owner;
      insert into public.sim_ledger(user_id,account_id,action_id,direction,amount_minor,currency,classification,label)
        values(owner,acct.id,r.id,'debit',minor,acct.currency,'internal-transfer','Transfer to '||dest.label),
          (owner,dest.id,r.id,'credit',minor,dest.currency,'internal-transfer','Transfer from '||acct.label);
      v_result := jsonb_build_object('message','Fictional own-account transfer completed','amountMinor',minor);
    when 'tuition' then
      target := (r.payload->>'tuitionId')::uuid;
      select amount_minor into minor from public.sim_tuition where user_id=owner and id=target and not paid for update;
      if minor is null then raise exception 'TUITION_UNAVAILABLE'; end if;
      if acct.balance_minor<minor then raise exception 'INSUFFICIENT_FUNDS'; end if;
      update public.sim_accounts set balance_minor=balance_minor-minor where id=acct.id and user_id=owner;
      update public.sim_tuition set paid=true where user_id=owner and id=target;
      insert into public.sim_ledger(user_id,account_id,action_id,direction,amount_minor,currency,classification,label)
        values(owner,acct.id,r.id,'debit',minor,'CNY','external-transfer','Simulated tuition payment');
      v_result := jsonb_build_object('message','Fictional tuition obligation marked paid','amountMinor',minor);
    when 'budget' then
      option_text := r.payload->>'limitMinor';
      if option_text is null or option_text !~ '^[1-9][0-9]{0,9}$' then raise exception 'INVALID_LIMIT'; end if;
      update public.sim_budgets set limit_minor=option_text::bigint
        where user_id=owner and category=r.payload->>'category';
      if not found then raise exception 'BUDGET_NOT_FOUND'; end if;
      v_result := jsonb_build_object('message','Simulated budget updated','limitMinor',option_text);
    when 'subscription' then
      target := (r.payload->>'subscriptionId')::uuid;
      update public.sim_subscriptions set active=false where user_id=owner and id=target and active=true;
      if not found then raise exception 'SUBSCRIPTION_NOT_ACTIVE'; end if;
      v_result := jsonb_build_object('message','Fictional subscription cancelled');
    when 'card' then
      target := (r.payload->>'cardId')::uuid;
      option_text := r.payload->>'mode';
      if option_text = 'freeze' then
        update public.sim_cards set frozen=true where id=target and user_id=owner;
      elsif option_text='unfreeze' then
        update public.sim_cards set frozen=false where id=target and user_id=owner;
      elsif option_text='limit' then
        if (r.payload->>'limitMinor') !~ '^[1-9][0-9]{0,9}$' then raise exception 'INVALID_LIMIT'; end if;
        update public.sim_cards set monthly_limit_minor=(r.payload->>'limitMinor')::bigint where id=target and user_id=owner;
      else raise exception 'CARD_MODE_INVALID'; end if;
      if not found then raise exception 'CARD_NOT_FOUND'; end if;
      v_result := jsonb_build_object('message','Fictional card setting updated');
    when 'investment' then
      target := (r.payload->>'productId')::uuid;
      if not exists(select 1 from public.sim_products where user_id=owner and id=target) then raise exception 'PRODUCT_NOT_FOUND'; end if;
      option_text := r.payload->>'direction';
      if option_text = 'buy' then
        if acct.balance_minor < minor then raise exception 'INSUFFICIENT_FUNDS'; end if;
        update public.sim_accounts set balance_minor=balance_minor-minor where user_id=owner and id=acct.id;
        insert into public.sim_holdings(user_id,product_id,value_minor) values(owner,target,minor)
          on conflict(user_id,product_id) do update set value_minor=public.sim_holdings.value_minor+excluded.value_minor;
        insert into public.sim_ledger(user_id,account_id,action_id,direction,amount_minor,currency,classification,label)
          values(owner,acct.id,r.id,'debit',minor,'CNY','asset-movement','Fictional investment buy');
      elsif option_text='redeem' then
        update public.sim_holdings set value_minor=value_minor-minor
          where user_id=owner and product_id=target and value_minor>=minor;
        if not found then raise exception 'INSUFFICIENT_HOLDINGS'; end if;
        update public.sim_accounts set balance_minor=balance_minor+minor where user_id=owner and id=acct.id;
        insert into public.sim_ledger(user_id,account_id,action_id,direction,amount_minor,currency,classification,label)
          values(owner,acct.id,r.id,'credit',minor,'CNY','asset-movement','Fictional investment redemption');
      else raise exception 'INVESTMENT_DIRECTION_INVALID'; end if;
      v_result := jsonb_build_object('message','Fictional investment order completed','amountMinor',minor);
    else raise exception 'ACTION_NOT_ALLOWED';
  end case;
  update public.sim_profiles set version=version+1 where user_id=owner;
  v_result := v_result || jsonb_build_object('status','executed','id',r.id,'kind',kind,'version',current_version+1);
  update public.sim_actions set status='executed',result=v_result,decided_at=now() where user_id=owner and id=r.id;
  insert into public.sim_audit(user_id,action_id,event,detail)
    values(owner,r.id,'action.executed',jsonb_build_object('type',kind,'version',current_version+1));
  return v_result;
end;
$$;
commit;
