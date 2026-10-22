begin;
create table private.bank_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_active_at timestamptz not null default clock_timestamp()
);
create table private.bank_rate_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket bigint not null,
  kind text not null check (kind in ('read','write')),
  calls integer not null,
  primary key(user_id,bucket,kind)
);
alter table private.bank_sessions enable row level security;
alter table private.bank_rate_windows enable row level security;
revoke all on private.bank_sessions,private.bank_rate_windows from public,anon,authenticated;
create index bank_sessions_user_idx on private.bank_sessions(user_id);

create function private.bank_recent_mfa() returns boolean
language sql stable security invoker set search_path='' as $$
  select coalesce(auth.jwt()->>'aal'='aal2' and exists (
    select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a
    where a->>'method'='totp' and (a->>'timestamp')::numeric between
      extract(epoch from now())-300 and extract(epoch from now())+30
  ),false);
$$;
create function private.bank_session_valid() returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(auth.jwt()->>'aal'='aal2' and exists (
    select 1 from auth.sessions s join private.bank_sessions b on b.session_id=s.id and b.user_id=s.user_id
    where s.id=nullif(auth.jwt()->>'session_id','')::uuid and s.user_id=auth.uid()
      and s.created_at>now()-interval '8 hours'
      and (s.not_after is null or s.not_after>now())
      and b.last_active_at>now()-interval '15 minutes'
  ),false);
$$;
create function private.bank_guard(p_write boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); sid uuid; started timestamptz; last_seen timestamptz; n integer; ceiling integer;
begin
  if owner is null then raise exception 'AUTH_REQUIRED'; end if;
  if auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'MFA_REQUIRED'; end if;
  sid:=nullif(auth.jwt()->>'session_id','')::uuid;
  select created_at into started from auth.sessions where id=sid and user_id=owner and (not_after is null or not_after>clock_timestamp());
  if started is null or started<clock_timestamp()-interval '8 hours' then raise exception 'SESSION_EXPIRED'; end if;
  select last_active_at into last_seen from private.bank_sessions where session_id=sid and user_id=owner for update;
  if last_seen is null then
    if not private.bank_recent_mfa() then raise exception 'REAUTH_REQUIRED'; end if;
    insert into private.bank_sessions(session_id,user_id) values(sid,owner) on conflict do nothing;
  elsif last_seen<clock_timestamp()-interval '15 minutes' then raise exception 'SESSION_EXPIRED';
  end if;
  if p_write and not private.bank_recent_mfa() then raise exception 'REAUTH_REQUIRED'; end if;
  ceiling:=case when p_write then 20 else 120 end;
  insert into private.bank_rate_windows(user_id,bucket,kind,calls)
    values(owner,floor(extract(epoch from clock_timestamp())/60)::bigint,case when p_write then 'write' else 'read' end,1)
    on conflict(user_id,bucket,kind) do update set calls=private.bank_rate_windows.calls+1 returning calls into n;
  if n>ceiling then raise exception 'RATE_LIMITED'; end if;
  delete from private.bank_rate_windows where user_id=owner and bucket<floor(extract(epoch from clock_timestamp())/60)::bigint-1440;
  update private.bank_sessions set last_active_at=clock_timestamp() where session_id=sid and user_id=owner;
  return jsonb_build_object('status','ok');
end;
$$;
create function public.bank_security_guard() returns jsonb
language sql security invoker set search_path='' as $$ select private.bank_guard(false); $$;
revoke all on function private.bank_recent_mfa(),private.bank_session_valid(),private.bank_guard(boolean),public.bank_security_guard() from public,anon,authenticated;
grant execute on function private.bank_session_valid(),public.bank_security_guard() to authenticated;
-- Invoker wrapper requires this grant; direct calls enforce the same verified JWT/session constraints.
grant execute on function private.bank_guard(boolean) to authenticated;

create or replace function private.sim_initialize() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid();
begin
  perform private.bank_guard(true);
  if owner is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.sim_profiles(user_id) values(owner) on conflict do nothing;
  perform 1 from public.sim_profiles where user_id=owner for update;
  insert into public.sim_accounts(user_id,label,currency,balance_minor) values
    (owner,'Daily CNY','CNY',1865000),(owner,'Savings CNY','CNY',1200000),
    (owner,'Daily USD','USD',65000),(owner,'Daily SGD','SGD',32000),
    (owner,'Daily IDR','IDR',2500000)
    on conflict(user_id,label) do nothing;
  insert into public.sim_budgets(user_id,category,limit_minor) values
    (owner,'rent',300000),(owner,'food',105000),(owner,'transportation',50000),
    (owner,'shopping',58000),(owner,'other',7000)
    on conflict(user_id,category) do nothing;
  insert into public.sim_subscriptions(user_id,merchant,monthly_minor) values
    (owner,'Campus Video',6800),(owner,'Student Fitness',8200)
    on conflict(user_id,merchant) do nothing;
  insert into public.sim_cards(user_id,label,masked_number,monthly_limit_minor) values
    (owner,'Daily virtual','•••• 4821',300000),(owner,'Online shopping','•••• 9256',120000)
    on conflict(user_id,label) do nothing;
  insert into public.sim_tuition(user_id,label,amount_minor) values
    (owner,'Fudan tuition installment',500000) on conflict(user_id,label) do nothing;
  insert into public.sim_products(user_id,name,risk,description) values
    (owner,'Fictional Cash Reserve','low','Demonstration money market equivalent'),
    (owner,'Fictional Balanced Fund','medium','Demonstration diversified fund'),
    (owner,'Fictional Equity Index','high','Demonstration equity index fund')
    on conflict(user_id,name) do nothing;
  return jsonb_build_object('status','ready','version',0);
end;
$$;

create or replace function private.sim_prepare(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); v bigint; rid uuid; kind text; pending_count bigint;
begin
  perform private.bank_guard(true);
  if owner is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>2048 then
    raise exception 'INVALID_ACTION'; end if;
  kind := p_payload->>'type';
  if kind not in ('transfer','tuition','budget','subscription','card','investment') or kind is null then
    raise exception 'ACTION_NOT_ALLOWED'; end if;
  select version into v from public.sim_profiles where user_id=owner;
  if v is null then raise exception 'INITIALIZE_REQUIRED'; end if;
  select count(*) into pending_count from public.sim_actions
    where user_id=owner and status='pending' and expires_at>now();
  if pending_count >= 20 then raise exception 'TOO_MANY_PENDING_ACTIONS'; end if;
  insert into public.sim_actions(user_id,payload,state_version)
    values(owner,p_payload,v) returning id into rid;
  return jsonb_build_object('id',rid,'status','pending','version',v,'expiresInSeconds',600,'payload',p_payload);
end;
$$;

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
alter policy owner_read on public.sim_profiles using ((select auth.uid())=user_id and (select private.bank_session_valid()));
alter policy owner_read on public.sim_accounts using ((select auth.uid())=user_id and (select private.bank_session_valid()));
alter policy owner_read on public.sim_budgets using ((select auth.uid())=user_id and (select private.bank_session_valid()));
alter policy owner_read on public.sim_subscriptions using ((select auth.uid())=user_id and (select private.bank_session_valid()));
alter policy owner_read on public.sim_cards using ((select auth.uid())=user_id and (select private.bank_session_valid()));
alter policy owner_read on public.sim_tuition using ((select auth.uid())=user_id and (select private.bank_session_valid()));
alter policy owner_read on public.sim_products using ((select auth.uid())=user_id and (select private.bank_session_valid()));
alter policy owner_read on public.sim_holdings using ((select auth.uid())=user_id and (select private.bank_session_valid()));
alter policy owner_read on public.sim_actions using ((select auth.uid())=user_id and (select private.bank_session_valid()));
alter policy owner_read on public.sim_ledger using ((select auth.uid())=user_id and (select private.bank_session_valid()));
alter policy owner_read on public.sim_audit using ((select auth.uid())=user_id and (select private.bank_session_valid()));
commit;
