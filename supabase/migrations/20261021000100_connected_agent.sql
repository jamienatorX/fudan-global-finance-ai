begin;
create table public.sim_purchase_history (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
 account_id uuid not null,merchant text not null,amount_minor bigint not null check(amount_minor>0),currency text not null check(currency in ('CNY','USD','IDR','SGD')),
 category text not null default 'other',occurred_at timestamptz not null,source text not null default 'explicit fictional fixture',
 foreign key(user_id,account_id) references public.sim_accounts(user_id,id),unique(user_id,merchant,occurred_at)
);
create index sim_purchase_owner_date on public.sim_purchase_history(user_id,occurred_at,id);
alter table public.sim_purchase_history enable row level security;
create policy owner_read on public.sim_purchase_history for select to authenticated using((select auth.uid())=user_id and (select private.bank_session_valid()));
revoke all on public.sim_purchase_history from public,anon,authenticated;
grant select on public.sim_purchase_history to authenticated;

create table public.sim_agent_plans (
 id uuid primary key,user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
 plan jsonb not null,state_version bigint not null,created_at timestamptz not null default now(),expires_at timestamptz not null default(now()+interval '10 minutes')
);
create index sim_agent_owner_date on public.sim_agent_plans(user_id,created_at);
alter table public.sim_agent_plans enable row level security;
create policy owner_read on public.sim_agent_plans for select to authenticated using((select auth.uid())=user_id and (select private.bank_session_valid()));
revoke all on public.sim_agent_plans from public,anon,authenticated;
grant select on public.sim_agent_plans to authenticated;

create function private.bank_agent_sample_history() returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();acct uuid;added integer;
begin
 perform private.bank_guard(true);
 perform 1 from public.sim_profiles where user_id=owner for update;
 if not found then raise exception 'ENROLLMENT_REQUIRED';end if;
 select id into acct from public.sim_accounts where user_id=owner and label='Daily CNY';
 insert into public.sim_purchase_history(user_id,account_id,merchant,amount_minor,currency,occurred_at)
 select owner,acct,s.merchant,s.monthly_minor,'CNY',date_trunc('month',now())-make_interval(months=>m)+interval '4 days 8 hours'
 from public.sim_subscriptions s cross join generate_series(0,2) m where s.user_id=owner and s.monthly_minor>0
 on conflict(user_id,merchant,occurred_at) do nothing;
 get diagnostics added=row_count;
 if added>0 then
  update public.sim_profiles set version=version+1 where user_id=owner;
  insert into public.sim_audit(user_id,event,detail) values(owner,'agent.sample-history.loaded',jsonb_build_object('rows',added,'source','fictional fixture; no balance changes'));
 end if;
 return jsonb_build_object('status','loaded','rows',added);
end $$;

create function private.bank_agent_store_plan(p_plan jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();v bigint;rid uuid;
begin
 perform private.bank_guard(true);
 select version into v from public.sim_profiles where user_id=owner for update;
 if v is null then raise exception 'ENROLLMENT_REQUIRED';end if;
 if octet_length(p_plan::text)>200000 or jsonb_typeof(p_plan->'actions') is distinct from 'array' or jsonb_array_length(p_plan->'actions')>10 then raise exception 'INVALID_PLAN';end if;
 if (p_plan->>'version')::bigint is distinct from v then raise exception 'STALE_STATE';end if;
 rid:=(p_plan->>'id')::uuid;
 insert into public.sim_agent_plans(id,user_id,plan,state_version) values(rid,owner,p_plan,v);
 insert into public.sim_audit(user_id,event,detail) values(owner,'agent.plan.created',jsonb_build_object('correlationId',rid,'mode',p_plan->>'mode','actions',jsonb_array_length(p_plan->'actions')));
 return jsonb_build_object('id',rid);
end $$;

create function private.bank_agent_prepare(p_plan_id uuid,p_index integer) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if payload->>'type' not in ('subscription','card') or payload->>'type' is null then raise exception 'INVALID_ACTION';end if;
 prepared:=private.sim_prepare(payload);
 insert into public.sim_audit(user_id,action_id,event,detail) values(auth.uid(),(prepared->>'id')::uuid,'agent.action.prepared',jsonb_build_object('correlationId',r.id,'index',p_index));
 return prepared;
end $$;
revoke all on function private.bank_agent_sample_history(),private.bank_agent_store_plan(jsonb),private.bank_agent_prepare(uuid,integer) from public,anon;
grant execute on function private.bank_agent_sample_history(),private.bank_agent_store_plan(jsonb),private.bank_agent_prepare(uuid,integer) to authenticated;
create function private.bank_agent_execute(p_action_id uuid,p_approve boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.sim_actions%rowtype;outcome jsonb;verified boolean:=false;
begin
 perform private.bank_guard(true);
 select * into r from public.sim_actions where id=p_action_id and user_id=auth.uid() for update;
 if not found then raise exception 'ACTION_NOT_FOUND';end if;
 if not exists(select 1 from public.sim_audit where user_id=auth.uid() and action_id=r.id and event='agent.action.prepared') then raise exception 'AGENT_ACTION_REQUIRED';end if;
 if r.status<>'pending' then return coalesce(r.result,jsonb_build_object('status',r.status,'id',r.id));end if;
 outcome:=private.sim_execute(p_action_id,p_approve);
 if outcome->>'status'='executed' then
  if r.payload->>'type'='subscription' then
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
revoke all on function private.bank_agent_execute(uuid,boolean) from public,anon;
grant execute on function private.bank_agent_execute(uuid,boolean) to authenticated;
create function public.bank_agent_sample_history() returns jsonb language sql security invoker set search_path='' as $$select private.bank_agent_sample_history();$$;
create function public.bank_agent_store_plan(p_plan jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.bank_agent_store_plan(p_plan);$$;
create function public.bank_agent_prepare(p_plan_id uuid,p_index integer) returns jsonb language sql security invoker set search_path='' as $$select private.bank_agent_prepare(p_plan_id,p_index);$$;
create function public.bank_agent_execute(p_action_id uuid,p_approve boolean) returns jsonb language sql security invoker set search_path='' as $$select private.bank_agent_execute(p_action_id,p_approve);$$;
revoke all on function public.bank_agent_sample_history(),public.bank_agent_store_plan(jsonb),public.bank_agent_prepare(uuid,integer),public.bank_agent_execute(uuid,boolean) from public,anon;
grant execute on function public.bank_agent_sample_history(),public.bank_agent_store_plan(jsonb),public.bank_agent_prepare(uuid,integer),public.bank_agent_execute(uuid,boolean) to authenticated;
create index sim_purchase_owner_account on public.sim_purchase_history(user_id,account_id);
commit;


