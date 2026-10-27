begin;
-- Extend the authenticated fictional-money engine. No bank or merchant network is called.
create table public.bank_demo_beneficiaries (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.sim_profiles(user_id),
 name text not null, phone text not null, remark text not null, currency text not null default 'CNY' check(currency='CNY'),
 verified boolean not null default true, created_at timestamptz not null default clock_timestamp(), unique(user_id,name)
);
create table public.bank_reservations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.sim_profiles(user_id),
 account_id uuid not null references public.sim_accounts(id), action_id uuid not null references public.sim_actions(id),
 remaining_minor bigint not null check(remaining_minor>=0), label text not null,
 created_at timestamptz not null default clock_timestamp()
);
create table public.bank_scheduled_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.sim_profiles(user_id),
 mandate_action_id uuid not null references public.sim_actions(id), session_id uuid not null,
 reservation_id uuid references public.bank_reservations(id), payload jsonb not null,
 due_at timestamptz not null, label text not null,
 status text not null default 'scheduled' check(status in ('scheduled','paused','needs_verification','failed','cancelled','completed')),
 attempts integer not null default 0, last_error text, executed_action_id uuid references public.sim_actions(id),
 created_at timestamptz not null default clock_timestamp(), unique(mandate_action_id,label)
);
create table public.bank_split_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.sim_profiles(user_id),
 action_id uuid not null references public.sim_actions(id), participant text not null, position integer not null,
 amount_minor bigint not null check(amount_minor>0), currency text not null, label text not null,
 status text not null default 'requested' check(status in ('requested','cancelled')), unique(action_id,position)
);
create table public.bank_renewal_notices (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.sim_profiles(user_id),
 subscription_id uuid not null references public.sim_subscriptions(id), renewal_date date not null,
 message text not null, created_at timestamptz not null default clock_timestamp(), unique(subscription_id,renewal_date)
);
create table public.bank_action_evidence (
 action_id uuid primary key references public.sim_actions(id), user_id uuid not null references public.sim_profiles(user_id),
 session_id uuid, payload jsonb not null, policy jsonb not null, decision text not null,
 verification_id uuid, result jsonb not null, recorded_at timestamptz not null default clock_timestamp()
);
alter table public.sim_cards add column lost boolean not null default false;
alter table public.sim_cards add column online_enabled boolean not null default true;
alter table public.sim_cards add column international_enabled boolean not null default true;
alter table public.sim_cards add column daily_limit_minor bigint not null default 100000 check(daily_limit_minor>=0);
alter table public.sim_subscriptions add column next_renewal date;
-- A date is populated only by explicit fictional initialization, never represented as a provider date.
create index bank_demo_beneficiaries_owner on public.bank_demo_beneficiaries(user_id);
create index bank_reservations_owner_account on public.bank_reservations(user_id,account_id);
create index bank_jobs_due on public.bank_scheduled_jobs(due_at) where status='scheduled';
create index bank_reservations_account on public.bank_reservations(account_id);
create index bank_reservations_action on public.bank_reservations(action_id);
create index bank_jobs_reservation on public.bank_scheduled_jobs(reservation_id);
create index bank_jobs_execution on public.bank_scheduled_jobs(executed_action_id);
create index bank_jobs_owner on public.bank_scheduled_jobs(user_id,created_at);
create index bank_split_owner on public.bank_split_requests(user_id);
create index bank_renewal_owner on public.bank_renewal_notices(user_id,created_at);
create index bank_evidence_owner on public.bank_action_evidence(user_id,recorded_at);
-- Reads are owner/session scoped; all writes go through guarded functions.
do $$declare t text;begin
 foreach t in array array['bank_demo_beneficiaries','bank_reservations','bank_scheduled_jobs','bank_split_requests','bank_renewal_notices','bank_action_evidence'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using(user_id=(select auth.uid()) and (select private.bank_session_valid()))',t);
 end loop;
end $$;

create function private.bank_scenario_initialize() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.bank_guard(true);
 perform 1 from public.sim_profiles where user_id=auth.uid() for update;
 if not found then raise exception 'ENROLLMENT_REQUIRED';end if;
 insert into public.bank_demo_beneficiaries(user_id,name,phone,remark) values
 (auth.uid(),'Zhang Wei','13800000001','Demo Zhang'),(auth.uid(),'Li Mei','13800000002','Demo Li') on conflict(user_id,name) do nothing;
 update public.sim_subscriptions set next_renewal=(date_trunc('month',clock_timestamp() at time zone 'Asia/Shanghai')+interval '1 month 4 days')::date where user_id=auth.uid() and next_renewal is null;
 return jsonb_build_object('status','ready','source','Explicit fictional contacts and renewal dates; no provider verification');
end $$;

-- Reject code, authority fields and unknown payload fields at the database boundary.
alter function private.sim_prepare(jsonb) rename to sim_prepare_before_scenarios;
revoke all on function private.sim_prepare_before_scenarios(jsonb) from public,anon,authenticated;
create function private.sim_prepare(p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare allowed text[];result jsonb;
begin
 perform private.bank_guard(false);
 if jsonb_typeof(p_payload)='object' and (p_payload->>'type' is null or p_payload->>'type' not in ('transfer','tuition','budget','subscription','card','investment')) then return private.sim_prepare_before_scenarios(p_payload);end if;
 allowed:=case p_payload->>'type'
 when 'transfer' then array['type','mode','sourceId','destinationId','beneficiaryId','amountMinor','scheduledAt','participants','label','birthday','flowerMinor','cakeMinor','jobId']
 when 'card' then array['type','mode','cardId','limitMinor','label','dailyLimitMinor','onlineEnabled','internationalEnabled']
 when 'budget' then array['type','category','limitMinor']
 when 'investment' then array['type','sourceId','productId','direction','amountMinor','riskTolerance']
 when 'tuition' then array['type','sourceId','tuitionId']
 when 'subscription' then array['type','subscriptionId'] else array['type'] end;
 if p_payload->>'type'='transfer' then
  if coalesce(p_payload->>'mode','') not in ('','schedule','split','birthday','job') then raise exception 'INVALID_TRANSFER_MODE';end if;
  allowed:=case coalesce(p_payload->>'mode','')
   when 'schedule' then array['type','mode','sourceId','destinationId','beneficiaryId','amountMinor','scheduledAt']
   when 'split' then array['type','mode','sourceId','amountMinor','participants','label']
   when 'birthday' then array['type','mode','sourceId','amountMinor','flowerMinor','cakeMinor','birthday','label']
   when 'job' then array['type','mode','sourceId','destinationId','beneficiaryId','amountMinor','label','jobId']
   else array['type','sourceId','destinationId','beneficiaryId','amountMinor'] end;
 elsif p_payload->>'type'='card' then
  allowed:=case p_payload->>'mode'
   when 'create' then array['type','mode','label','limitMinor']
   when 'restrictions' then array['type','mode','cardId','dailyLimitMinor','onlineEnabled','internationalEnabled']
   when 'limit' then array['type','mode','cardId','limitMinor']
   else array['type','mode','cardId'] end;
 end if;
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'INVALID_ACTION_FIELDS';end if;
 if exists(select 1 from jsonb_object_keys(p_payload) k where not k=any(allowed)) or exists(select 1 from jsonb_each(p_payload) kv where jsonb_typeof(kv.value)<>'string') then raise exception 'INVALID_ACTION_FIELDS';end if;
 result:=private.sim_prepare_before_scenarios(p_payload);
 return result;
end $$;
revoke all on function private.sim_prepare(jsonb) from public,anon;
grant execute on function private.sim_prepare(jsonb) to authenticated;

alter function private.bank_policy(uuid) rename to bank_policy_before_scenarios;
create function private.bank_policy(p_action_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;a public.sim_actions%rowtype;b public.bank_demo_beneficiaries%rowtype;review jsonb;
begin
 p:=private.bank_policy_before_scenarios(p_action_id);
 select * into a from public.sim_actions where id=p_action_id and user_id=auth.uid();
 if a.payload->>'type'='card' and a.payload->>'mode' in ('lost','restore','restrictions') then p:=p||jsonb_build_object('tier','Red','reason','CARD_SECURITY_VERIFICATION','verificationRequired',true);end if;
 if a.payload->>'mode'='split' then p:=p||jsonb_build_object('tier','Yellow','reason','COLLECTION_REQUEST_ONLY','verificationRequired',false);end if;
 review:=p->'review';
 if a.payload ? 'beneficiaryId' then
 select * into b from public.bank_demo_beneficiaries where id=(a.payload->>'beneficiaryId')::uuid and user_id=auth.uid() and verified;
 if not found then raise exception 'VERIFIED_BENEFICIARY_REQUIRED';end if;
 review:=review||jsonb_build_object('Recipient',b.name,'Phone','••••'||right(b.phone,4),'Remark',b.remark);
 end if;
 review:=review||jsonb_strip_nulls(jsonb_build_object('Schedule',a.payload->>'scheduledAt','Birthday',a.payload->>'birthday','Label',a.payload->>'label','Participants',a.payload->>'participants','Flowers minor units',a.payload->>'flowerMinor','Cake minor units',a.payload->>'cakeMinor','Online allowed',a.payload->>'onlineEnabled','International allowed',a.payload->>'internationalEnabled','Daily limit minor units',a.payload->>'dailyLimitMinor'));
 return p||jsonb_build_object('review',review);
end $$;
revoke all on function private.bank_policy_before_scenarios(uuid),private.bank_policy(uuid) from public,anon,authenticated;

-- A saved mandate remains subject to the originating workflow's takeover/pause.
create function private.bank_mandate_gate(p_action uuid,p_owner uuid) returns text language sql stable security definer set search_path='' as $$
 select case when bool_or(w.handoff) then 'HUMAN_TAKEOVER_ACTIVE'
 when bool_or(w.status in ('paused','failed','cancelled')) then 'WORKFLOW_PAUSED' else null end
 from public.bank_workflow_nodes n join public.bank_workflows w on w.id=n.workflow_id and w.user_id=p_owner
 where n.action_id=p_action and n.user_id=p_owner;
$$;
revoke all on function private.bank_mandate_gate(uuid,uuid) from public,anon,authenticated;

alter function private.sim_execute_unchecked(uuid,boolean) rename to sim_execute_before_scenarios;
revoke all on function private.sim_execute_before_scenarios(uuid,boolean) from public,anon,authenticated;
create function private.sim_execute_unchecked(p_action_id uuid,p_approve boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.sim_actions%rowtype;acct public.sim_accounts%rowtype;b public.bank_demo_beneficiaries%rowtype;j public.bank_scheduled_jobs%rowtype;
 payload jsonb;kind text;mode text;minor bigint;reserved bigint;v bigint;rid uuid;new_id uuid;due timestamptz;names text[];i integer;v_outcome jsonb;special boolean;debit boolean;
begin
 perform private.bank_guard(true);
 select version into v from public.sim_profiles where user_id=auth.uid() for update;
 select * into a from public.sim_actions where id=p_action_id and user_id=auth.uid() for update;
 if not found then raise exception 'ACTION_NOT_FOUND';end if;
 if a.status<>'pending' then return coalesce(a.result,jsonb_build_object('status',a.status,'id',a.id));end if;
 if p_approve is null then raise exception 'DECISION_REQUIRED';end if;
 if not p_approve or a.expires_at<=clock_timestamp() or a.state_version<>v then return private.sim_execute_before_scenarios(p_action_id,p_approve);end if;
 payload:=a.payload;kind:=payload->>'type';mode:=coalesce(payload->>'mode','');
 if kind='transfer' and payload ? 'scheduledAt' and mode<>'schedule' then raise exception 'INVALID_ACTION_FIELDS';end if;
 if kind='transfer' and mode='job' then
  select * into j from public.bank_scheduled_jobs where id=(payload->>'jobId')::uuid and user_id=auth.uid() for update;
  if not found or j.status not in ('needs_verification','failed','scheduled') or j.due_at>clock_timestamp() then raise exception 'JOB_NOT_READY';end if;
  if private.bank_mandate_gate(j.mandate_action_id,auth.uid()) is not null then raise exception using message=private.bank_mandate_gate(j.mandate_action_id,auth.uid());end if;
  if (payload-'mode'-'jobId') is distinct from j.payload then raise exception 'APPROVAL_TAMPERED';end if;
  if not exists(select 1 from auth.sessions where id=j.session_id and user_id=auth.uid() and (not_after is null or not_after>clock_timestamp())) then raise exception 'MANDATE_SESSION_REVOKED';end if;
 end if;
 if kind in ('transfer','tuition','investment') then
  select * into acct from public.sim_accounts where user_id=auth.uid() and id=(payload->>'sourceId')::uuid for update;
  if not found then raise exception 'OWNED_SOURCE_REQUIRED';end if;
  if kind='tuition' then select amount_minor into minor from public.sim_tuition where user_id=auth.uid() and id=(payload->>'tuitionId')::uuid and not paid;
  else if payload->>'amountMinor' is null or payload->>'amountMinor' !~ '^[1-9][0-9]{0,10}$' then raise exception 'INVALID_AMOUNT';end if;minor:=(payload->>'amountMinor')::bigint;end if;
  select coalesce(sum(remaining_minor),0) into reserved from public.bank_reservations where user_id=auth.uid() and account_id=acct.id;
  -- A job may consume its own reservation, never somebody else's reservation.
  if mode='job' and j.reservation_id is not null then
   if not exists(select 1 from public.bank_reservations where id=j.reservation_id and user_id=auth.uid() and remaining_minor>=minor) then raise exception 'RESERVATION_UNAVAILABLE';end if;
   reserved:=reserved-minor;
  end if;
  debit:=kind='tuition' or kind='investment' and payload->>'direction'='buy' or kind='transfer' and mode not in ('schedule','split');
  if debit and acct.balance_minor-reserved<minor then if reserved>0 then raise exception 'INSUFFICIENT_AVAILABLE_FUNDS';else raise exception 'INSUFFICIENT_FUNDS';end if;end if;
 end if;
 if kind='card' and mode='unfreeze' and exists(select 1 from public.sim_cards where user_id=auth.uid() and id=(payload->>'cardId')::uuid and lost) then raise exception 'CARD_REPORTED_LOST';end if;
 special:=kind='transfer' and (payload ? 'beneficiaryId' or mode in ('schedule','split','birthday','job')) or kind='card' and mode in ('create','lost','restore','restrictions');
 if not special then return private.sim_execute_before_scenarios(p_action_id,p_approve);end if;
 if kind='transfer' then
  if mode not in ('','schedule','split','birthday','job') then raise exception 'INVALID_TRANSFER_MODE';end if;
  if mode='schedule' then
   due:=(payload->>'scheduledAt')::timestamptz;
   if due is null or due<=clock_timestamp() or due>clock_timestamp()+interval '366 days' then raise exception 'INVALID_SCHEDULE';end if;
   if (payload ? 'destinationId')=(payload ? 'beneficiaryId') then raise exception 'DESTINATION_REQUIRED';end if;
   if payload ? 'destinationId' and not exists(select 1 from public.sim_accounts where user_id=auth.uid() and id=(payload->>'destinationId')::uuid and currency=acct.currency and id<>acct.id) then raise exception 'OWNED_DESTINATION_REQUIRED';end if;
   if payload ? 'beneficiaryId' and not exists(select 1 from public.bank_demo_beneficiaries where user_id=auth.uid() and id=(payload->>'beneficiaryId')::uuid and verified and currency=acct.currency) then raise exception 'VERIFIED_BENEFICIARY_REQUIRED';end if;
   insert into public.bank_scheduled_jobs(user_id,mandate_action_id,session_id,payload,due_at,label) values(auth.uid(),a.id,(auth.jwt()->>'session_id')::uuid,payload-'mode'-'scheduledAt',due,'Scheduled fictional transfer') returning id into new_id;
   v_outcome:=jsonb_build_object('message','Exact fictional transfer mandate saved; no money debited','jobId',new_id);
  elsif mode='birthday' then
   if acct.currency<>'CNY' or payload->>'flowerMinor' is null or payload->>'cakeMinor' is null or payload->>'flowerMinor' !~ '^[1-9][0-9]{0,10}$' or payload->>'cakeMinor' !~ '^[1-9][0-9]{0,10}$' or (payload->>'flowerMinor')::bigint+(payload->>'cakeMinor')::bigint<>minor then raise exception 'INVALID_BIRTHDAY_BUDGET';end if;
   due:=((payload->>'birthday')::date-2)::timestamp at time zone 'Asia/Shanghai';
   if due<=clock_timestamp() or due>clock_timestamp()+interval '366 days' then raise exception 'INVALID_SCHEDULE';end if;
   insert into public.bank_reservations(user_id,account_id,action_id,remaining_minor,label) values(auth.uid(),acct.id,a.id,minor,left(coalesce(payload->>'label','Birthday'),100)) returning id into rid;
   for i in 0..1 loop
    insert into public.bank_scheduled_jobs(user_id,mandate_action_id,session_id,reservation_id,payload,due_at,label)
    values(auth.uid(),a.id,(auth.jwt()->>'session_id')::uuid,rid,jsonb_build_object('type','transfer','sourceId',acct.id::text,'amountMinor',case when i=0 then payload->>'flowerMinor' else payload->>'cakeMinor' end,'label',case when i=0 then 'Fictional flowers' else 'Fictional cake' end),due,case when i=0 then 'Fictional flowers' else 'Fictional cake' end);
   end loop;
   v_outcome:=jsonb_build_object('message','Birthday funds reserved; two fictional orders scheduled two days before the birthday. No merchant contacted.','reservationId',rid);
  elsif mode='split' then
   names:=string_to_array(payload->>'participants','|');
   if cardinality(names) is null or cardinality(names)<2 or cardinality(names)>10 or minor<cardinality(names) or exists(select 1 from unnest(names) n where length(trim(n))<1 or length(n)>80) or (select count(distinct lower(trim(n))) from unnest(names)n)<>cardinality(names) then raise exception 'INVALID_PARTICIPANTS';end if;
   for i in 1..cardinality(names) loop
    insert into public.bank_split_requests(user_id,action_id,participant,position,amount_minor,currency,label) values(auth.uid(),a.id,trim(names[i]),i-1,minor/cardinality(names)+case when i<=minor%cardinality(names) then 1 else 0 end,acct.currency,left(coalesce(payload->>'label','Split bill'),100));
   end loop;
   v_outcome:=jsonb_build_object('message','Fictional collection requests created. No messages sent and no funds collected.');
  else
   if mode='job' and j.reservation_id is not null then
    -- The two allowlisted birthday items are the only merchant fulfilment simulator.
    if payload ? 'beneficiaryId' or payload ? 'destinationId' or payload->>'label' not in ('Fictional flowers','Fictional cake') then raise exception 'MERCHANT_UNAVAILABLE';end if;
    update public.sim_accounts set balance_minor=balance_minor-minor where id=acct.id;
    insert into public.sim_ledger(user_id,account_id,action_id,direction,amount_minor,currency,classification,label) values(auth.uid(),acct.id,a.id,'debit',minor,acct.currency,'external-transfer',payload->>'label');
    v_outcome:=jsonb_build_object('message','Fictional birthday item fulfilled; no real merchant order','fulfilment','simulated');
   elsif payload ? 'beneficiaryId' then
    if payload ? 'destinationId' then raise exception 'AMBIGUOUS_DESTINATION';end if;
    select * into b from public.bank_demo_beneficiaries where user_id=auth.uid() and id=(payload->>'beneficiaryId')::uuid and verified and currency=acct.currency;
    if not found then raise exception 'VERIFIED_BENEFICIARY_REQUIRED';end if;
    update public.sim_accounts set balance_minor=balance_minor-minor where id=acct.id;
    insert into public.sim_ledger(user_id,account_id,action_id,direction,amount_minor,currency,classification,label) values(auth.uid(),acct.id,a.id,'debit',minor,acct.currency,'external-transfer','Fictional transfer to '||b.name);
    v_outcome:=jsonb_build_object('message','Fictional beneficiary transfer completed; no bank contacted','beneficiaryId',b.id);
   elsif mode='job' then
    -- Delegate ordinary own-account effects to the established atomic implementation.
    v_outcome:=private.sim_execute_before_scenarios(a.id,true);
    if v_outcome->>'status'<>'executed' then return v_outcome;end if;
   else raise exception 'DESTINATION_REQUIRED';end if;
   if mode='job' then
    update public.bank_scheduled_jobs set status='completed',last_error=null,executed_action_id=a.id where id=j.id;
    if j.reservation_id is not null then update public.bank_reservations set remaining_minor=remaining_minor-minor where id=j.reservation_id;end if;
   end if;
   v_outcome:=v_outcome||jsonb_build_object('amountMinor',minor);
  end if;
 elsif kind='card' then
  if mode='create' then
   if length(trim(coalesce(payload->>'label','')))<1 or length(payload->>'label')>80 or payload->>'limitMinor' is null or payload->>'limitMinor' !~ '^[1-9][0-9]{0,9}$' then raise exception 'INVALID_CARD';end if;
   if (select count(*) from public.sim_cards where user_id=auth.uid())>=10 then raise exception 'CARD_LIMIT';end if;
   new_id:=gen_random_uuid();
   insert into public.sim_cards(id,user_id,label,masked_number,monthly_limit_minor) values(new_id,auth.uid(),trim(payload->>'label'),'•••• '||lpad((abs(hashtext(new_id::text)::bigint)%10000)::text,4,'0'),(payload->>'limitMinor')::bigint);
   v_outcome:=jsonb_build_object('message','Fictional virtual card created','cardId',new_id);
  else
   if mode='lost' then update public.sim_cards set lost=true,frozen=true where user_id=auth.uid() and id=(payload->>'cardId')::uuid;
   elsif mode='restore' then update public.sim_cards set lost=false,frozen=true where user_id=auth.uid() and id=(payload->>'cardId')::uuid;
   elsif mode='restrictions' then
    if payload->>'onlineEnabled' not in ('true','false') or payload->>'internationalEnabled' not in ('true','false') or payload->>'dailyLimitMinor' is null or payload->>'dailyLimitMinor' !~ '^[0-9]{1,10}$' then raise exception 'INVALID_RESTRICTIONS';end if;
    update public.sim_cards set online_enabled=(payload->>'onlineEnabled')::boolean,international_enabled=(payload->>'internationalEnabled')::boolean,daily_limit_minor=(payload->>'dailyLimitMinor')::bigint where user_id=auth.uid() and id=(payload->>'cardId')::uuid;
   end if;
   if not found then raise exception 'CARD_NOT_FOUND';end if;
   v_outcome:=jsonb_build_object('message','Fictional card security updated; restoration leaves the card frozen');
  end if;
 end if;
 -- A delegated own-account job has already recorded its version and v_outcome.
 if not(kind='transfer' and mode='job' and j.reservation_id is null and not(payload ? 'beneficiaryId')) then
  update public.sim_profiles set version=version+1 where user_id=auth.uid() returning version into v;
  v_outcome:=v_outcome||jsonb_build_object('status','executed','id',a.id,'kind',kind,'version',v);
 end if;
 v_outcome:=v_outcome||jsonb_build_object('verified',true);
 update public.sim_actions set status='executed',result=v_outcome,decided_at=clock_timestamp() where id=a.id;
 insert into public.sim_audit(user_id,action_id,event,detail) values(auth.uid(),a.id,'scenario.action.verified',jsonb_build_object('payload',payload,'result',v_outcome,'source','atomic database effect'));
 return v_outcome;
end $$;
revoke all on function private.sim_execute_unchecked(uuid,boolean) from public,anon,authenticated;

-- The existing checked executor remains the single policy/MFA/lock gateway.
-- Scheduling and request creation are not executed transfers in today's allowance.
do $$declare definition text;begin
 select pg_get_functiondef('private.bank_checked_execute(uuid,boolean,boolean)'::regprocedure) into definition;
 definition:=replace(definition,'if a.payload->>''type'' in (''transfer'',''tuition'') then','if a.payload->>''type'' in (''transfer'',''tuition'') and coalesce(a.payload->>''mode'','''') not in (''schedule'',''birthday'',''split'') then');
 execute definition;
end $$;
-- Extended actions verify their effects atomically; the original verifier handles legacy actions.
alter function private.bank_agent_execute_unchecked(uuid,boolean) rename to bank_agent_execute_before_scenarios;
revoke all on function private.bank_agent_execute_before_scenarios(uuid,boolean) from public,anon,authenticated;
create function private.bank_agent_execute_unchecked(p_action_id uuid,p_approve boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.sim_actions%rowtype;
begin
 select * into a from public.sim_actions where id=p_action_id and user_id=auth.uid();
 if not exists(select 1 from public.sim_audit where user_id=auth.uid() and action_id=a.id and event='agent.action.prepared') then raise exception 'AGENT_ACTION_REQUIRED';end if;
 if a.payload ? 'beneficiaryId' or a.payload ? 'mode' and (a.payload->>'type'='transfer' or a.payload->>'mode' in ('create','lost','restore','restrictions')) then return private.sim_execute_unchecked(p_action_id,p_approve);end if;
 return private.bank_agent_execute_before_scenarios(p_action_id,p_approve);
end $$;
revoke all on function private.bank_agent_execute_unchecked(uuid,boolean) from public,anon,authenticated;

-- Immutable, inspectable authorization evidence. No authenticator secrets are stored.
alter function private.bank_checked_execute(uuid,boolean,boolean) rename to bank_checked_execute_before_evidence;
revoke all on function private.bank_checked_execute_before_evidence(uuid,boolean,boolean) from public,anon,authenticated;
create function private.bank_checked_execute(p_action_id uuid,p_approve boolean,p_agent boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;r jsonb;a public.sim_actions%rowtype;gid uuid;
begin
 perform private.bank_guard(false);
 select * into a from public.sim_actions where id=p_action_id and user_id=auth.uid();
 r:=private.bank_checked_execute_before_evidence(p_action_id,p_approve,p_agent);
 if a.id is not null and r->>'status'<>'denied' then
  p:=private.bank_policy(a.id);
  select id into gid from private.bank_action_grants where user_id=auth.uid() and action_id=a.id and consumed_at is not null order by created_at desc limit 1;
  insert into public.bank_action_evidence(action_id,user_id,session_id,payload,policy,decision,verification_id,result)
  values(a.id,auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,a.payload,p,case when p_approve then 'approved' else 'rejected' end,gid,r) on conflict(action_id) do nothing;
 end if;
 return r;
end $$;
revoke all on function private.bank_checked_execute(uuid,boolean,boolean) from public,anon,authenticated;
create function private.bank_action_evidence(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 perform private.bank_guard(false);
 select to_jsonb(e) into r from public.bank_action_evidence e where action_id=p_id and user_id=auth.uid();
 if r is null then raise exception 'ACTION_NOT_FOUND';end if;
 return r||jsonb_build_object('events',(select coalesce(jsonb_agg(to_jsonb(a) order by created_at),'[]') from public.sim_audit a where user_id=auth.uid() and action_id=p_id),'securityEvents',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at),'[]') from public.bank_security_events e where user_id=auth.uid() and action_id=p_id));
end $$;

create function private.bank_job_command(p_id uuid,p_command text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.bank_scheduled_jobs%rowtype;r jsonb;
begin
 perform private.bank_guard(true);
 perform 1 from public.sim_profiles where user_id=auth.uid() for update;
 select * into j from public.bank_scheduled_jobs where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'JOB_NOT_FOUND';end if;
 if j.status in ('completed','cancelled') then return to_jsonb(j);end if;
 if p_command='pause' and j.status='scheduled' then update public.bank_scheduled_jobs set status='paused' where id=j.id;
 elsif p_command='resume' and j.status='paused' then update public.bank_scheduled_jobs set status='scheduled' where id=j.id;
 elsif p_command='cancel' then
  update public.bank_scheduled_jobs set status='cancelled' where id=j.id;
  if j.reservation_id is not null then update public.bank_reservations set remaining_minor=remaining_minor-(j.payload->>'amountMinor')::bigint where id=j.reservation_id and user_id=auth.uid();end if;
  update public.sim_profiles set version=version+1 where user_id=auth.uid();
 elsif p_command='review' and j.status in ('needs_verification','failed','scheduled') and j.due_at<=clock_timestamp() then
  r:=private.sim_prepare(j.payload||jsonb_build_object('mode','job','jobId',j.id::text));
 else raise exception 'INVALID_JOB_COMMAND';end if;
 insert into public.sim_audit(user_id,event,detail) values(auth.uid(),'job.'||p_command,jsonb_build_object('jobId',j.id));
 return coalesce(r,(select to_jsonb(job) from public.bank_scheduled_jobs job where id=j.id));
end $$;

-- This worker cannot authenticate as a customer and cannot use an MFA grant.
-- Only exact preapproved CNY mandates below the daily limit may execute unattended.
create function private.bank_jobs_tick() returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.bank_scheduled_jobs%rowtype;a public.sim_accounts%rowtype;dest public.sim_accounts%rowtype;reserved bigint;minor bigint;used bigint;aid uuid;outcome jsonb;v bigint;processed integer:=0;owner uuid;gate text;
begin
 -- Lock owner first, matching every interactive path; SKIP LOCKED avoids worker contention.
 for owner in select distinct user_id from public.bank_scheduled_jobs where status='scheduled' and due_at<=clock_timestamp() order by user_id limit 100 loop
  perform 1 from public.sim_profiles where user_id=owner for update skip locked;if not found then continue;end if;
  for j in select * from public.bank_scheduled_jobs where user_id=owner and status='scheduled' and due_at<=clock_timestamp() order by due_at,id for update skip locked limit 20 loop
   gate:=private.bank_mandate_gate(j.mandate_action_id,owner);
   if gate is not null then update public.bank_scheduled_jobs set last_error=gate where id=j.id;continue;end if;
   minor:=(j.payload->>'amountMinor')::bigint;
   update public.bank_scheduled_jobs set attempts=attempts+1 where id=j.id;
   if exists(select 1 from private.bank_safety_locks where user_id=owner and (recovery_required or expires_at>clock_timestamp())) then
    update public.bank_scheduled_jobs set status='failed',last_error='SAFETY_LOCKED' where id=j.id;continue;
   end if;
   if not exists(select 1 from auth.sessions where id=j.session_id and user_id=owner and (not_after is null or not_after>clock_timestamp())) then
    update public.bank_scheduled_jobs set status='failed',last_error='MANDATE_SESSION_REVOKED' where id=j.id;continue;
   end if;
   select * into a from public.sim_accounts where id=(j.payload->>'sourceId')::uuid and user_id=owner for update;
   select coalesce(sum(cny_minor),0) into used from private.bank_transfer_usage where user_id=owner and day=(clock_timestamp() at time zone 'Asia/Shanghai')::date;
   if a.currency is distinct from 'CNY' or used+minor>100000 or exists(select 1 from private.bank_transfer_usage where user_id=owner and day=(clock_timestamp() at time zone 'Asia/Shanghai')::date and cny_minor is null) then
    update public.bank_scheduled_jobs set status='needs_verification',last_error='ACTION_VERIFICATION_REQUIRED' where id=j.id;continue;
   end if;
   select coalesce(sum(remaining_minor),0) into reserved from public.bank_reservations where user_id=owner and account_id=a.id;
   if j.reservation_id is not null then
    if not exists(select 1 from public.bank_reservations where id=j.reservation_id and user_id=owner and remaining_minor>=minor) then update public.bank_scheduled_jobs set status='failed',last_error='RESERVATION_UNAVAILABLE' where id=j.id;continue;end if;
    reserved:=reserved-minor;
   end if;
   if a.balance_minor-reserved<minor then update public.bank_scheduled_jobs set status='failed',last_error='INSUFFICIENT_AVAILABLE_FUNDS' where id=j.id;continue;end if;
   if j.payload ? 'destinationId' then
    select * into dest from public.sim_accounts where id=(j.payload->>'destinationId')::uuid and user_id=owner and currency=a.currency and id<>a.id for update;
    if not found then update public.bank_scheduled_jobs set status='failed',last_error='OWNED_DESTINATION_REQUIRED' where id=j.id;continue;end if;
   elsif j.payload ? 'beneficiaryId' then
    if not exists(select 1 from public.bank_demo_beneficiaries where id=(j.payload->>'beneficiaryId')::uuid and user_id=owner and verified and currency=a.currency) then update public.bank_scheduled_jobs set status='failed',last_error='VERIFIED_BENEFICIARY_REQUIRED' where id=j.id;continue;end if;
   elsif j.reservation_id is null or j.payload->>'label' not in ('Fictional flowers','Fictional cake') then update public.bank_scheduled_jobs set status='failed',last_error='MERCHANT_UNAVAILABLE' where id=j.id;continue;
   end if;
   select version into v from public.sim_profiles where user_id=owner;
   aid:=gen_random_uuid();outcome:=jsonb_build_object('status','executed','verified',true,'id',aid,'version',v+1,'amountMinor',minor,'message','Scheduled fictional operation completed; no external provider contacted');
   insert into public.sim_actions(id,user_id,payload,state_version,status,result,decided_at) values(aid,owner,j.payload,v,'executed',outcome,clock_timestamp());
   update public.sim_accounts set balance_minor=balance_minor-minor where id=a.id;
   insert into public.sim_ledger(user_id,account_id,action_id,direction,amount_minor,currency,classification,label) values(owner,a.id,aid,'debit',minor,a.currency,case when j.payload ? 'destinationId' then 'internal-transfer' else 'external-transfer' end,j.label);
   if j.payload ? 'destinationId' then
    update public.sim_accounts set balance_minor=balance_minor+minor where id=dest.id;
    insert into public.sim_ledger(user_id,account_id,action_id,direction,amount_minor,currency,classification,label) values(owner,dest.id,aid,'credit',minor,dest.currency,'internal-transfer',j.label);
   end if;
   if j.reservation_id is not null then update public.bank_reservations set remaining_minor=remaining_minor-minor where id=j.reservation_id;end if;
   update public.sim_profiles set version=version+1 where user_id=owner;
   insert into private.bank_transfer_usage(action_id,user_id,day,cny_minor,currency) values(aid,owner,(clock_timestamp() at time zone 'Asia/Shanghai')::date,minor,a.currency);
   update public.bank_scheduled_jobs set status='completed',last_error=null,executed_action_id=aid where id=j.id;
   insert into public.sim_audit(user_id,action_id,event,detail) values(owner,aid,'job.executed',jsonb_build_object('jobId',j.id,'mandateActionId',j.mandate_action_id,'policy','Yellow','result',outcome));
   insert into public.bank_action_evidence(action_id,user_id,session_id,payload,policy,decision,result) values(aid,owner,j.session_id,j.payload,jsonb_build_object('tier','Yellow','reason','EXACT_SCHEDULED_MANDATE','dailyCnyMinor',used+minor),'approved mandate',outcome);
   processed:=processed+1;
  end loop;
 end loop;
 insert into public.bank_renewal_notices(user_id,subscription_id,renewal_date,message)
 select user_id,id,next_renewal,merchant||' has a recorded fictional renewal on '||next_renewal::text||'. Review cancellation before this date; no provider connection.' from public.sim_subscriptions
 where active and next_renewal between (clock_timestamp() at time zone 'Asia/Shanghai')::date and (clock_timestamp() at time zone 'Asia/Shanghai')::date+7 on conflict(subscription_id,renewal_date) do nothing;
 return jsonb_build_object('processed',processed);
end $$;
-- No client role can run the global scheduler. A trusted DB cron owner is required.
revoke all on function private.bank_jobs_tick() from public,anon,authenticated;

create function private.bank_scheduler_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare configured boolean:=false;
begin
 perform private.bank_guard(false);
 if to_regclass('cron.job') is not null then
  execute 'select exists(select 1 from cron.job where jobname=''fu-bank-fictional-mandates'' and active and command=''select private.bank_jobs_tick();'')' into configured;
 end if;
 return jsonb_build_object('configured',configured,'executionHealth','Check saved task outcomes; configuration does not prove a successful run');
end $$;
create function public.bank_scheduler_status() returns jsonb language sql security invoker set search_path='' as $$select private.bank_scheduler_status();$$;
revoke all on function private.bank_scheduler_status(),public.bank_scheduler_status() from public,anon;
grant execute on function private.bank_scheduler_status(),public.bank_scheduler_status() to authenticated;

-- Expose only small invoker wrappers, with independently guarded private helpers.
create function public.bank_scenario_initialize() returns jsonb language sql security invoker set search_path='' as $$ select private.bank_scenario_initialize(); $$;
create function public.bank_job_command(p_id uuid,p_command text) returns jsonb language sql security invoker set search_path='' as $$ select private.bank_job_command(p_id,p_command); $$;
create function public.bank_action_evidence(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.bank_action_evidence(p_id); $$;
revoke all on function private.bank_scenario_initialize(),private.bank_job_command(uuid,text),private.bank_action_evidence(uuid),public.bank_scenario_initialize(),public.bank_job_command(uuid,text),public.bank_action_evidence(uuid) from public,anon;
grant execute on function private.bank_scenario_initialize(),private.bank_job_command(uuid,text),private.bank_action_evidence(uuid),public.bank_scenario_initialize(),public.bank_job_command(uuid,text),public.bank_action_evidence(uuid) to authenticated;
commit;
