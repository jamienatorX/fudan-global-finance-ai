-- Persistent, fictional-money sandbox. This is NOT a bank/payment processor.
-- Roles have SELECT only; all writes execute via owner-checked RPC transitions.
begin;

create table public.sim_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null default 0 check (version >= 0),
  created_at timestamptz not null default now()
);
create table public.sim_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
  label text not null check (length(label) between 2 and 80),
  currency text not null check (currency in ('CNY','USD','SGD','IDR')),
  balance_minor bigint not null check (balance_minor >= 0),
  unique (user_id,id), unique(user_id,label)
);
create table public.sim_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
  category text not null check (category in ('rent','food','transportation','shopping','other')),
  limit_minor bigint not null check (limit_minor >= 0),
  unique(user_id,category)
);
create table public.sim_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
  merchant text not null,
  monthly_minor bigint not null check (monthly_minor >= 0),
  active boolean not null default true,
  unique(user_id,merchant)
);
create table public.sim_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
  label text not null, masked_number text not null,
  frozen boolean not null default false,
  monthly_limit_minor bigint not null check (monthly_limit_minor >= 0),
  unique(user_id,label)
);
create table public.sim_tuition (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
  label text not null,
  amount_minor bigint not null check (amount_minor > 0),
  paid boolean not null default false,
  unique(user_id,label)
);
create table public.sim_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
  name text not null, risk text not null check(risk in ('low','medium','high')),
  description text not null, unique(user_id,name), unique(user_id,id)
);
create table public.sim_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
  product_id uuid not null,
  value_minor bigint not null default 0 check(value_minor >= 0),
  unique(user_id,product_id),
  foreign key (user_id,product_id) references public.sim_products(user_id,id)
);
create table public.sim_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
  payload jsonb not null,
  state_version bigint not null,
  status text not null default 'pending' check(status in ('pending','rejected','expired','stale','executed')),
  result jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '10 minutes'),
  decided_at timestamptz,
  unique(user_id,id)
);
create table public.sim_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
  account_id uuid not null,
  action_id uuid not null,
  direction text not null check(direction in ('debit','credit')),
  amount_minor bigint not null check(amount_minor > 0),
  currency text not null check(currency in ('CNY','USD','SGD','IDR')),
  classification text not null check(classification in ('internal-transfer','external-transfer','asset-movement')),
  label text not null,
  created_at timestamptz not null default now(),
  foreign key (user_id,account_id) references public.sim_accounts(user_id,id),
  foreign key (user_id,action_id) references public.sim_actions(user_id,id)
);
create table public.sim_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sim_profiles(user_id) on delete cascade,
  action_id uuid,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index sim_accounts_owner_idx on public.sim_accounts(user_id);
create index sim_actions_owner_created_idx on public.sim_actions(user_id,created_at desc);
create index sim_ledger_owner_created_idx on public.sim_ledger(user_id,created_at desc);
create index sim_ledger_owner_account_idx on public.sim_ledger(user_id,account_id);
create index sim_ledger_owner_action_idx on public.sim_ledger(user_id,action_id);
create index sim_audit_owner_created_idx on public.sim_audit(user_id,created_at desc);

alter table public.sim_profiles enable row level security;
alter table public.sim_accounts enable row level security;
alter table public.sim_budgets enable row level security;
alter table public.sim_subscriptions enable row level security;
alter table public.sim_cards enable row level security;
alter table public.sim_tuition enable row level security;
alter table public.sim_products enable row level security;
alter table public.sim_holdings enable row level security;
alter table public.sim_actions enable row level security;
alter table public.sim_ledger enable row level security;
alter table public.sim_audit enable row level security;
create policy owner_read on public.sim_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on public.sim_accounts for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on public.sim_budgets for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on public.sim_subscriptions for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on public.sim_cards for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on public.sim_tuition for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on public.sim_products for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on public.sim_holdings for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on public.sim_actions for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on public.sim_ledger for select to authenticated using ((select auth.uid())=user_id);
create policy owner_read on public.sim_audit for select to authenticated using ((select auth.uid())=user_id);

revoke all on public.sim_profiles,public.sim_accounts,public.sim_budgets,
 public.sim_subscriptions,public.sim_cards,public.sim_tuition,public.sim_products,
 public.sim_holdings,public.sim_actions,public.sim_ledger,public.sim_audit from public,anon,authenticated;
grant select on public.sim_profiles,public.sim_accounts,public.sim_budgets,
 public.sim_subscriptions,public.sim_cards,public.sim_tuition,public.sim_products,
 public.sim_holdings,public.sim_actions,public.sim_ledger,public.sim_audit to authenticated;

-- All private functions use SECURITY DEFINER because authenticated has NO table write
-- privileges. Every access is independently constrained by auth.uid().
create or replace function private.sim_initialize() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid();
begin
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

create or replace function public.sim_initialize() returns jsonb
language sql security invoker set search_path = '' as $$
  select private.sim_initialize();
$$;
create or replace function public.sim_prepare(p_payload jsonb) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.sim_prepare(p_payload);
$$;
create or replace function public.sim_execute(p_action_id uuid,p_approve boolean) returns jsonb
language sql security invoker set search_path = '' as $$
  select private.sim_execute(p_action_id,p_approve);
$$;

revoke all on function private.sim_initialize() from public,anon,authenticated;
revoke all on function private.sim_prepare(jsonb) from public,anon,authenticated;
revoke all on function private.sim_execute(uuid,boolean) from public,anon,authenticated;
revoke all on function public.sim_initialize() from public,anon,authenticated;
revoke all on function public.sim_prepare(jsonb) from public,anon,authenticated;
revoke all on function public.sim_execute(uuid,boolean) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.sim_initialize(),private.sim_prepare(jsonb),private.sim_execute(uuid,boolean) to authenticated;
grant execute on function public.sim_initialize(),public.sim_prepare(jsonb),public.sim_execute(uuid,boolean) to authenticated;
commit;
