begin;
create table public.bank_security_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 session_id uuid, action_id uuid, category text not null, is_failure boolean not null default false, created_at timestamptz not null default clock_timestamp()
);
create index bank_security_events_owner_time on public.bank_security_events(user_id,created_at);
alter table public.bank_security_events enable row level security;
create policy owner_read on public.bank_security_events for select to authenticated
 using(user_id=(select auth.uid()) and (select private.bank_session_valid()));
revoke all on public.bank_security_events from public,anon,authenticated;
grant select on public.bank_security_events to authenticated;
create table private.bank_safety_locks (
 user_id uuid primary key references auth.users(id), reason text not null, expires_at timestamptz,
 recovery_required boolean not null default false, reviewed_at timestamptz,
 created_at timestamptz not null default clock_timestamp()
);
create table private.bank_transfer_usage (
 action_id uuid primary key references public.sim_actions(id), user_id uuid not null references auth.users(id),
 day date not null, cny_minor bigint, currency text not null, created_at timestamptz not null default clock_timestamp()
);
create index bank_transfer_usage_owner_day on private.bank_transfer_usage(user_id,day);
-- Preserve today's already executed transfers when this policy is installed.
insert into private.bank_transfer_usage(action_id,user_id,day,cny_minor,currency,created_at)
select a.id,a.user_id,(coalesce(a.decided_at,a.created_at) at time zone 'Asia/Shanghai')::date,
 case when ac.currency='CNY' then coalesce((a.result->>'amountMinor')::bigint,(a.payload->>'amountMinor')::bigint) else null end,
 ac.currency,coalesce(a.decided_at,a.created_at)
from public.sim_actions a join public.sim_accounts ac on ac.id::text=a.payload->>'sourceId' and ac.user_id=a.user_id
where a.status='executed' and a.payload->>'type' in ('transfer','tuition') and coalesce(a.result->>'amountMinor',a.payload->>'amountMinor') ~ '^[1-9][0-9]{0,10}$';
create table private.bank_action_grants (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 session_id uuid not null, action_id uuid not null references public.sim_actions(id),
 action_hash text not null, state_version bigint not null, policy_version integer not null default 1,
 baseline numeric not null, verified_event numeric, expires_at timestamptz not null default(clock_timestamp()+interval '5 minutes'),
 consumed_at timestamptz, created_at timestamptz not null default clock_timestamp(),
 unique(user_id,session_id,verified_event)
);
create index bank_action_grants_action on private.bank_action_grants(user_id,action_id);
alter table private.bank_safety_locks enable row level security;
alter table private.bank_transfer_usage enable row level security;
alter table private.bank_action_grants enable row level security;
revoke all on private.bank_safety_locks,private.bank_transfer_usage,private.bank_action_grants from public,anon,authenticated;

create function private.bank_totp_time() returns numeric language sql stable security definer set search_path='' as $$
 select coalesce(max((a->>'timestamp')::numeric),0) from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]')) a
 where a->>'method'='totp' and (a->>'timestamp') ~ '^[0-9]+(\.[0-9]+)?$';
$$;
create function public.bank_security_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.bank_safety_locks%rowtype;
begin
 perform private.bank_guard(false);
 select * into r from private.bank_safety_locks where user_id=auth.uid();
 return jsonb_build_object('locked',coalesce(r.recovery_required or r.expires_at>clock_timestamp(),false),
 'reason',r.reason,'expiresAt',r.expires_at,'recoveryRequired',coalesce(r.recovery_required,false));
end $$;
create function private.bank_record_denial(p_category text,p_action uuid) returns void language plpgsql security definer set search_path='' as $$
declare n integer; suspicious boolean:=p_category in ('ACTION_NOT_FOUND','APPROVAL_TAMPERED','FORBIDDEN_OPERATION');
begin
 insert into public.bank_security_events(user_id,session_id,action_id,category,is_failure)
 values(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,p_action,p_category,true);
 select count(*) into n from public.bank_security_events where user_id=auth.uid()
 and created_at>clock_timestamp()-interval '10 minutes' and is_failure;
 if suspicious or n>=3 then
 insert into private.bank_safety_locks(user_id,reason,expires_at,recovery_required)
 values(auth.uid(),case when suspicious then 'SUSPICIOUS_ACTIVITY' else 'REPEATED_FAILURES' end,clock_timestamp()+interval '15 minutes',suspicious)
 on conflict(user_id) do update set reason=excluded.reason,expires_at=excluded.expires_at,
 recovery_required=private.bank_safety_locks.recovery_required or excluded.recovery_required,
 reviewed_at=null,created_at=clock_timestamp();
 end if;
end $$;

alter function private.bank_guard(boolean) rename to bank_guard_base;
revoke all on function private.bank_guard_base(boolean) from public,anon,authenticated;
create function private.bank_guard(p_write boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_write and exists(select 1 from private.bank_safety_locks where user_id=auth.uid()
 and (recovery_required or expires_at>clock_timestamp())) then raise exception 'SAFETY_LOCKED';end if;
 return private.bank_guard_base(p_write);
end $$;
grant execute on function private.bank_guard(boolean) to authenticated;
revoke all on function private.bank_guard(boolean) from public,anon;

create function private.bank_policy(p_action_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.sim_actions%rowtype; currency text; minor bigint; used bigint; unknown_usage boolean; tier text:='Yellow'; reason text:='EXACT_CONFIRMATION';
begin
 select * into a from public.sim_actions where id=p_action_id and user_id=auth.uid();
 if not found then raise exception 'ACTION_NOT_FOUND';end if;
 if a.payload->>'type' is null or a.payload->>'type' not in ('transfer','tuition','budget','subscription','card','investment') then raise exception 'ACTION_NOT_ALLOWED';end if;
 if a.payload->>'type'='investment' then tier:='Red';reason:='INVESTMENT_VERIFICATION';end if;
 if a.payload->>'type'='card' and a.payload->>'mode' in ('freeze','unfreeze') then tier:='Red';reason:='CARD_SECURITY_VERIFICATION';end if;
 if a.payload->>'type' in ('transfer','tuition') then
  select ac.currency into currency from public.sim_accounts ac where ac.user_id=auth.uid() and ac.id=(a.payload->>'sourceId')::uuid;
  if a.payload->>'type'='tuition' then
   select t.amount_minor into minor from public.sim_tuition t where t.user_id=auth.uid() and t.id::text=a.payload->>'tuitionId';
   if minor is null then raise exception 'TUITION_UNAVAILABLE';end if;
  else
   if a.payload->>'amountMinor' is null or (a.payload->>'amountMinor') !~ '^[1-9][0-9]{0,10}$' then raise exception 'INVALID_AMOUNT';end if;
   minor:=(a.payload->>'amountMinor')::bigint;
  end if;
  select coalesce(sum(cny_minor),0),coalesce(bool_or(cny_minor is null),false) into used,unknown_usage
  from private.bank_transfer_usage where user_id=auth.uid() and day=(clock_timestamp() at time zone 'Asia/Shanghai')::date and action_id<>a.id;
  if currency is distinct from 'CNY' or unknown_usage then tier:='Red';reason:='FX_EVIDENCE_REQUIRED';
  elsif used+minor>100000 then tier:='Red';reason:='DAILY_TRANSFER_THRESHOLD';end if;
 end if;
 return jsonb_build_object('tier',tier,'reason',reason,'policyVersion',1,'actionHash',encode(sha256(convert_to(a.payload::text,'UTF8')),'hex'),
 'dailyCnyMinor',case when currency='CNY' then used+minor else null end,'verificationRequired',tier='Red',
 'review',jsonb_strip_nulls(jsonb_build_object('Action',a.payload->>'type','Mode',coalesce(a.payload->>'mode',a.payload->>'direction'),
 'Currency',coalesce(currency,'CNY'),'Amount minor units',coalesce(minor::text,a.payload->>'amountMinor'),'Limit minor units',a.payload->>'limitMinor',
 'From',(select label from public.sim_accounts where user_id=auth.uid() and id::text=a.payload->>'sourceId'),
 'To',(select label from public.sim_accounts where user_id=auth.uid() and id::text=a.payload->>'destinationId'),
 'Category',a.payload->>'category','Card',(select label||' '||masked_number from public.sim_cards where user_id=auth.uid() and id::text=a.payload->>'cardId'),
 'Subscription',(select merchant from public.sim_subscriptions where user_id=auth.uid() and id::text=a.payload->>'subscriptionId'),
 'Investment',(select name from public.sim_products where user_id=auth.uid() and id::text=a.payload->>'productId'),
 'Tuition',(select label from public.sim_tuition where user_id=auth.uid() and id::text=a.payload->>'tuitionId'))));
end $$;
create function public.bank_action_policy(p_action_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.bank_guard(false);return private.bank_policy(p_action_id);end $$;

create function public.bank_action_verification_begin(p_action_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.sim_actions%rowtype; rid uuid; sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
begin
 perform private.bank_guard(false);
 perform 1 from public.sim_profiles where user_id=auth.uid() for update;
 select * into a from public.sim_actions where id=p_action_id and user_id=auth.uid() and status='pending' and expires_at>clock_timestamp();
 if not found then raise exception 'ACTION_NOT_FOUND';end if;
 update private.bank_action_grants set expires_at=clock_timestamp() where user_id=auth.uid() and session_id=sid and consumed_at is null;
 insert into private.bank_action_grants(user_id,session_id,action_id,action_hash,state_version,baseline)
 values(auth.uid(),sid,a.id,encode(sha256(convert_to(a.payload::text,'UTF8')),'hex'),a.state_version,
 greatest(private.bank_totp_time(),floor(extract(epoch from clock_timestamp())))) returning id into rid;
 return jsonb_build_object('id',rid,'status','challenge_required');
end $$;
create function public.bank_action_verification_complete(p_grant_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g private.bank_action_grants%rowtype; stamp numeric:=private.bank_totp_time(); a public.sim_actions%rowtype;
begin
 perform private.bank_guard(false);
 perform 1 from public.sim_profiles where user_id=auth.uid() for update;
 select * into g from private.bank_action_grants where id=p_grant_id and user_id=auth.uid()
 and session_id=nullif(auth.jwt()->>'session_id','')::uuid for update;
 if not found or g.consumed_at is not null or g.expires_at<=clock_timestamp() then perform private.bank_record_denial('VERIFICATION_EXPIRED',null);return jsonb_build_object('code','VERIFICATION_EXPIRED');end if;
 select * into a from public.sim_actions where id=g.action_id and user_id=auth.uid();
 if a.status<>'pending' or a.expires_at<=clock_timestamp() or encode(sha256(convert_to(a.payload::text,'UTF8')),'hex')<>g.action_hash or a.state_version<>g.state_version
 or not exists(select 1 from public.sim_profiles where user_id=auth.uid() and version=g.state_version) then return jsonb_build_object('code','STALE_STATE');end if;
 if not private.bank_recent_mfa() or stamp<=g.baseline or stamp<=floor(extract(epoch from g.created_at)) or exists(select 1 from private.bank_action_grants
 where user_id=auth.uid() and session_id=g.session_id and verified_event=stamp and id<>g.id) then
 perform private.bank_record_denial('FRESH_CHALLENGE_REQUIRED',g.action_id);return jsonb_build_object('code','FRESH_CHALLENGE_REQUIRED');end if;
 update private.bank_action_grants set verified_event=stamp where id=g.id;
 insert into public.bank_security_events(user_id,session_id,action_id,category) values(auth.uid(),g.session_id,a.id,'ACTION_MFA_VERIFIED');
 return jsonb_build_object('status','verified');
end $$;

alter function private.sim_prepare(jsonb) rename to sim_prepare_unchecked;
revoke all on function private.sim_prepare_unchecked(jsonb) from public,anon,authenticated;
create function private.sim_prepare(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.bank_guard(false);
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>2048
 or p_payload->>'type' is null or p_payload->>'type' not in ('transfer','tuition','budget','subscription','card','investment') then
  perform private.bank_record_denial('FORBIDDEN_OPERATION',null);
  return jsonb_build_object('status','denied','code','ACTION_NOT_ALLOWED');
 end if;
 return private.sim_prepare_unchecked(p_payload);
end $$;
revoke all on function private.sim_prepare(jsonb) from public,anon;
grant execute on function private.sim_prepare(jsonb) to authenticated;
alter function private.sim_execute(uuid,boolean) rename to sim_execute_unchecked;
alter function private.bank_agent_execute(uuid,boolean) rename to bank_agent_execute_unchecked;
revoke all on function private.sim_execute_unchecked(uuid,boolean),private.bank_agent_execute_unchecked(uuid,boolean) from public,anon,authenticated;

create function private.bank_workflow_action_gate(p_action_id uuid) returns text language sql stable security definer set search_path='' as $$select null::text;$$;
revoke all on function private.bank_workflow_action_gate(uuid) from public,anon,authenticated;
create function private.bank_checked_execute(p_action_id uuid,p_approve boolean,p_agent boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.sim_actions%rowtype; policy jsonb; outcome jsonb; gid uuid; code text; currency text;
begin
 perform private.bank_guard(false);
 -- Lock order is shared by legacy buttons, agent calls and workflow nodes.
 perform 1 from public.sim_profiles where user_id=auth.uid() for update;
 select * into a from public.sim_actions where id=p_action_id and user_id=auth.uid() for update;
 if not found then perform private.bank_record_denial('ACTION_NOT_FOUND',null);return jsonb_build_object('status','denied','code','ACTION_NOT_FOUND');end if;
 if a.status<>'pending' then return coalesce(a.result,jsonb_build_object('id',a.id,'status',a.status));end if;
 if exists(select 1 from public.sim_audit au join public.sim_agent_plans p on p.id=(au.detail->>'correlationId')::uuid and p.user_id=auth.uid()
 where au.user_id=auth.uid() and au.action_id=a.id and au.event='agent.action.prepared' and p.plan ? 'conversationId')
 and not exists(select 1 from public.sim_audit au join public.sim_agent_plans p on p.id=(au.detail->>'correlationId')::uuid and p.user_id=auth.uid()
 join public.sim_agent_conversations c on c.id::text=p.plan->>'conversationId' and c.user_id=auth.uid()
 where au.user_id=auth.uid() and au.action_id=a.id and au.event='agent.action.prepared' and c.session_id=nullif(auth.jwt()->>'session_id','')::uuid and c.expires_at>clock_timestamp()) then
  perform private.bank_record_denial('CONVERSATION_SESSION_REQUIRED',a.id);return jsonb_build_object('status','denied','code','CONVERSATION_SESSION_REQUIRED');
 end if;
 if p_approve then code:=private.bank_workflow_action_gate(a.id);if code is not null then return jsonb_build_object('status','denied','code',code);end if;end if;
 if exists(select 1 from private.bank_safety_locks where user_id=auth.uid() and (recovery_required or expires_at>clock_timestamp())) then
 return jsonb_build_object('status','denied','code','SAFETY_LOCKED');end if;
 begin
  policy:=private.bank_policy(a.id);
  if p_approve and policy->>'tier'='Red' then
   select id into gid from private.bank_action_grants where user_id=auth.uid() and action_id=a.id
   and session_id=nullif(auth.jwt()->>'session_id','')::uuid and consumed_at is null and expires_at>clock_timestamp()
   and verified_event is not null and state_version=a.state_version and policy_version=1 and action_hash=encode(sha256(convert_to(a.payload::text,'UTF8')),'hex') for update;
   if gid is null then perform private.bank_record_denial('ACTION_VERIFICATION_REQUIRED',a.id);return jsonb_build_object('status','denied','code','ACTION_VERIFICATION_REQUIRED','policy',policy);end if;
  end if;
  if p_agent then outcome:=private.bank_agent_execute_unchecked(a.id,p_approve);
  else outcome:=private.sim_execute_unchecked(a.id,p_approve);end if;
  if outcome->>'status'='executed' then
   if gid is not null then update private.bank_action_grants set consumed_at=clock_timestamp() where id=gid;end if;
   if a.payload->>'type' in ('transfer','tuition') then
    select ac.currency into currency from public.sim_accounts ac where ac.id=(a.payload->>'sourceId')::uuid and ac.user_id=auth.uid();
    insert into private.bank_transfer_usage(action_id,user_id,day,cny_minor,currency)
    values(a.id,auth.uid(),(clock_timestamp() at time zone 'Asia/Shanghai')::date,
    case when currency='CNY' then coalesce((outcome->>'amountMinor')::bigint,(a.payload->>'amountMinor')::bigint) else null end,currency) on conflict do nothing;
   end if;
   insert into public.bank_security_events(user_id,session_id,action_id,category)
   values(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,a.id,'EXECUTED_'||(policy->>'tier'));
  end if;
  return outcome;
 exception when others then
  code:=case when sqlerrm ~ '^[A-Z][A-Z_]{2,70}$' then sqlerrm else 'ACTION_REJECTED' end;
 end;
 -- Outside the business subtransaction: events survive a rejected mutation.
 perform private.bank_record_denial(code,a.id);
 return jsonb_build_object('status','denied','code',code);
end $$;
create function private.sim_execute(p_action_id uuid,p_approve boolean) returns jsonb language sql security definer set search_path='' as $$select private.bank_checked_execute(p_action_id,p_approve,false);$$;
create function private.bank_agent_execute(p_action_id uuid,p_approve boolean) returns jsonb language sql security definer set search_path='' as $$select private.bank_checked_execute(p_action_id,p_approve,true);$$;
-- Agent verification uses the original single action implementation internally,
-- avoiding recursion into a second grant/allowance decision.
do $$declare definition text;begin
 select pg_get_functiondef('private.bank_agent_execute_unchecked(uuid,boolean)'::regprocedure) into definition;
 definition:=replace(definition,'private.sim_execute(p_action_id,p_approve)','private.sim_execute_unchecked(p_action_id,p_approve)');
 execute definition;
end $$;
revoke all on function private.bank_totp_time(),private.bank_record_denial(text,uuid),private.bank_policy(uuid),private.bank_checked_execute(uuid,boolean,boolean) from public,anon,authenticated;
revoke all on function public.bank_security_status(),public.bank_action_policy(uuid),public.bank_action_verification_begin(uuid),public.bank_action_verification_complete(uuid),private.sim_execute(uuid,boolean),private.bank_agent_execute(uuid,boolean) from public,anon;
grant execute on function public.bank_security_status(),public.bank_action_policy(uuid),public.bank_action_verification_begin(uuid),public.bank_action_verification_complete(uuid),private.sim_execute(uuid,boolean),private.bank_agent_execute(uuid,boolean) to authenticated;

-- Keep the exposed API invoker-only; checked privileged helpers live privately.
do $wrappers$
declare fn record; args text; signature text; call_args text;
begin
 for fn in select p.oid,p.proname,p.proargnames from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname=any(array['bank_security_status','bank_action_policy','bank_action_verification_begin','bank_action_verification_complete']) loop
  args:=pg_get_function_arguments(fn.oid);signature:=pg_get_function_identity_arguments(fn.oid);call_args:=array_to_string(fn.proargnames,',');
  execute format('alter function public.%I(%s) set schema private',fn.proname,signature);
  execute format('create function public.%I(%s) returns jsonb language sql security invoker set search_path='''' as %L',fn.proname,args,'select private.'||quote_ident(fn.proname)||'('||coalesce(call_args,'')||');');
  execute format('revoke all on function private.%I(%s),public.%I(%s) from public,anon',fn.proname,signature,fn.proname,signature);
  execute format('grant execute on function private.%I(%s),public.%I(%s) to authenticated',fn.proname,signature,fn.proname,signature);
 end loop;
end $wrappers$;
commit;
