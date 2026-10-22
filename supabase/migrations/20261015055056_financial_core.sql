-- Financial foundation: explicit grants, owner RLS, one narrowly scoped private reset helper.
-- Authenticated table access is read-only; only canonical demo reset can mutate.
begin;
grant usage on schema public to authenticated;
create table public.users (
  user_id uuid not null references auth.users(id),
  is_demo boolean not null default false,
  seed_version text not null default 'v1',
  as_of text not null default '2026-10-14T00:00:00.000Z',
  "id" uuid not null,
  "profile" jsonb not null,
  "home_currency" text not null check (home_currency in ('CNY','IDR','USD','SGD')),
  "locale" text not null,
  "risk_profile_ref" text not null,
  primary key (user_id, id),
  unique(id),
  check (id = user_id)
);
alter table public.users enable row level security;
revoke all on public.users from public, anon, authenticated;
grant select on public.users to authenticated;
create policy users_read on public.users for select to authenticated using ((select auth.uid()) = user_id);
create index users_owner_idx on public.users (user_id);

create table public.accounts (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "type" text not null check ("type" in ('daily','savings')),
  "currency" text not null check (currency in ('CNY','IDR','USD','SGD')),
  balance_amount_minor bigint not null check (balance_amount_minor >= 0),
  balance_currency text not null check (balance_currency in ('CNY','IDR','USD','SGD')),
  available_balance_amount_minor bigint not null check (available_balance_amount_minor >= 0),
  available_balance_currency text not null check (available_balance_currency in ('CNY','IDR','USD','SGD')),
  "status" text not null check ("status" in ('active','closed')),
  goal_amount_minor bigint check (goal_amount_minor >= 0),
  goal_currency text check (goal_currency in ('CNY','IDR','USD','SGD')),
  check ((goal_amount_minor is null) = (goal_currency is null)),
  primary key (user_id, id),
  check (balance_currency = currency and available_balance_currency = currency and (goal_currency is null or goal_currency = currency)),
  check (available_balance_amount_minor <= balance_amount_minor)
);
alter table public.accounts enable row level security;
revoke all on public.accounts from public, anon, authenticated;
grant select on public.accounts to authenticated;
create policy accounts_read on public.accounts for select to authenticated using ((select auth.uid()) = user_id);
create index accounts_owner_idx on public.accounts (user_id);

create table public.exchange_rates (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "base" text not null check (base in ('CNY','IDR','USD','SGD')),
  "quote" text not null check (quote in ('CNY','IDR','USD','SGD')),
  "rate" text not null check (rate ~ '^[0-9]+(\.[0-9]+)?$' and rate ~ '[1-9]'),
  "provider" text not null,
  "reference_at" timestamptz not null,
  "retrieved_at" timestamptz not null,
  "source" text not null check ("source" in ('live','fallback')),
  primary key (user_id, id)
);
alter table public.exchange_rates enable row level security;
revoke all on public.exchange_rates from public, anon, authenticated;
grant select on public.exchange_rates to authenticated;
create policy exchange_rates_read on public.exchange_rates for select to authenticated using ((select auth.uid()) = user_id);
create index exchange_rates_owner_idx on public.exchange_rates (user_id);

create table public.beneficiaries (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "display_name" text not null,
  "phone" text not null,
  "account_alias" text not null,
  "supported_currencies" jsonb not null check (jsonb_typeof(supported_currencies) = 'array' and supported_currencies <@ '["CNY","IDR","USD","SGD"]'::jsonb),
  "verification_state" text not null check ("verification_state" in ('verified','unverified')),
  primary key (user_id, id)
);
alter table public.beneficiaries enable row level security;
revoke all on public.beneficiaries from public, anon, authenticated;
grant select on public.beneficiaries to authenticated;
create policy beneficiaries_read on public.beneficiaries for select to authenticated using ((select auth.uid()) = user_id);
create index beneficiaries_owner_idx on public.beneficiaries (user_id);

create table public.transactions (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "account_id" uuid not null,
  "direction" text not null check ("direction" in ('credit','debit')),
  amount_amount_minor bigint not null check (amount_amount_minor >= 0),
  amount_currency text not null check (amount_currency in ('CNY','IDR','USD','SGD')),
  "original_currency" text not null check (original_currency in ('CNY','IDR','USD','SGD')),
  "category" text not null check ("category" in ('rent','food','transportation','shopping','other','family-allowance','scholarship','transfer','investment')),
  "classification" text not null check ("classification" in ('income','consumption','internal-transfer','asset-movement','external-transfer')),
  "merchant" text not null,
  "occurred_at" timestamptz not null,
  "recorded_at" timestamptz not null,
  "transfer_id" uuid,
  "investment_order_id" uuid,
  "subscription_id" uuid,
  "recurrence" jsonb,
  "anomaly" text,
  primary key (user_id, id)
);
alter table public.transactions enable row level security;
revoke all on public.transactions from public, anon, authenticated;
grant select on public.transactions to authenticated;
create policy transactions_read on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create index transactions_owner_idx on public.transactions (user_id);

create table public.transfers (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "source_account_id" uuid not null,
  "destination_account_id" uuid,
  "beneficiary_id" uuid,
  "tuition_obligation_id" uuid,
  amount_amount_minor bigint not null check (amount_amount_minor >= 0),
  amount_currency text not null check (amount_currency in ('CNY','IDR','USD','SGD')),
  "currency" text not null check (currency in ('CNY','IDR','USD','SGD')),
  "scheduled_at" timestamptz,
  "status" text not null check ("status" in ('scheduled','completed','failed')),
  "receipt_ref" text,
  "idempotency_key" text not null,
  "initiated_by" uuid not null,
  "plan_id" uuid,
  "action_id" uuid,
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null,
  "audit_event_id" uuid not null,
  primary key (user_id, id),
  unique(user_id, idempotency_key),
  check (initiated_by = user_id),
  check (amount_currency = currency)
);
alter table public.transfers enable row level security;
revoke all on public.transfers from public, anon, authenticated;
grant select on public.transfers to authenticated;
create policy transfers_read on public.transfers for select to authenticated using ((select auth.uid()) = user_id);
create index transfers_owner_idx on public.transfers (user_id);

create table public.budgets (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "month" text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  "category" text not null check ("category" in ('rent','food','transportation','shopping','other')),
  limit_amount_minor bigint not null check (limit_amount_minor >= 0),
  limit_currency text not null check (limit_currency in ('CNY','IDR','USD','SGD')),
  actual_spend_amount_minor bigint not null check (actual_spend_amount_minor >= 0),
  actual_spend_currency text not null check (actual_spend_currency in ('CNY','IDR','USD','SGD')),
  "currency" text not null check (currency in ('CNY','IDR','USD','SGD')),
  "status" text not null check ("status" in ('within-limit','over-limit')),
  primary key (user_id, id),
  unique(user_id, month, category),
  check (limit_currency = currency and actual_spend_currency = currency)
);
alter table public.budgets enable row level security;
revoke all on public.budgets from public, anon, authenticated;
grant select on public.budgets to authenticated;
create policy budgets_read on public.budgets for select to authenticated using ((select auth.uid()) = user_id);
create index budgets_owner_idx on public.budgets (user_id);

create table public.cards (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "account_id" uuid not null,
  "masked_number" text not null,
  "card_type" text not null check (card_type = 'virtual'),
  "purpose" text not null check ("purpose" in ('daily','online-shopping')),
  "freeze_state" text not null check ("freeze_state" in ('active','frozen')),
  daily_limit_amount_minor bigint not null check (daily_limit_amount_minor >= 0),
  daily_limit_currency text not null check (daily_limit_currency in ('CNY','IDR','USD','SGD')),
  monthly_limit_amount_minor bigint not null check (monthly_limit_amount_minor >= 0),
  monthly_limit_currency text not null check (monthly_limit_currency in ('CNY','IDR','USD','SGD')),
  check (daily_limit_currency = monthly_limit_currency),
  primary key (user_id, id)
);
alter table public.cards enable row level security;
revoke all on public.cards from public, anon, authenticated;
grant select on public.cards to authenticated;
create policy cards_read on public.cards for select to authenticated using ((select auth.uid()) = user_id);
create index cards_owner_idx on public.cards (user_id);

create table public.card_restrictions (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "card_id" uuid not null,
  "merchant_category" text not null,
  "state" text not null check ("state" in ('allow','deny')),
  primary key (user_id, id)
);
alter table public.card_restrictions enable row level security;
revoke all on public.card_restrictions from public, anon, authenticated;
grant select on public.card_restrictions to authenticated;
create policy card_restrictions_read on public.card_restrictions for select to authenticated using ((select auth.uid()) = user_id);
create index card_restrictions_owner_idx on public.card_restrictions (user_id);

create table public.subscriptions (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "merchant" text not null,
  amount_amount_minor bigint not null check (amount_amount_minor >= 0),
  amount_currency text not null check (amount_currency in ('CNY','IDR','USD','SGD')),
  "currency" text not null check (currency in ('CNY','IDR','USD','SGD')),
  "cadence" text not null check ("cadence" in ('monthly','yearly')),
  "next_renewal_at" timestamptz not null,
  "last_usage_at" timestamptz,
  "status" text not null check ("status" in ('active','cancelled')),
  primary key (user_id, id),
  check (amount_currency = currency)
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from public, anon, authenticated;
grant select on public.subscriptions to authenticated;
create policy subscriptions_read on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create index subscriptions_owner_idx on public.subscriptions (user_id);

create table public.investment_products (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "name" text not null,
  "fictional" boolean not null check (fictional = true),
  "category" text not null check ("category" in ('money-market','bond','balanced','equity-index')),
  "simulated_risk" text not null check ("simulated_risk" in ('low','medium','high')),
  "fee_basis_points" integer not null check (fee_basis_points between 0 and 10000),
  "liquidity" text not null check ("liquidity" in ('daily','t-plus-2')),
  "historical_simulation" jsonb not null,
  "disclaimer" text not null,
  primary key (user_id, id)
);
alter table public.investment_products enable row level security;
revoke all on public.investment_products from public, anon, authenticated;
grant select on public.investment_products to authenticated;
create policy investment_products_read on public.investment_products for select to authenticated using ((select auth.uid()) = user_id);
create index investment_products_owner_idx on public.investment_products (user_id);

create table public.holdings (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "product_id" uuid not null,
  "units" text not null check (units ~ '^[0-9]+(\.[0-9]+)?$'),
  cost_basis_amount_minor bigint not null check (cost_basis_amount_minor >= 0),
  cost_basis_currency text not null check (cost_basis_currency in ('CNY','IDR','USD','SGD')),
  simulated_value_amount_minor bigint not null check (simulated_value_amount_minor >= 0),
  simulated_value_currency text not null check (simulated_value_currency in ('CNY','IDR','USD','SGD')),
  primary key (user_id, id)
);
alter table public.holdings enable row level security;
revoke all on public.holdings from public, anon, authenticated;
grant select on public.holdings to authenticated;
create policy holdings_read on public.holdings for select to authenticated using ((select auth.uid()) = user_id);
create index holdings_owner_idx on public.holdings (user_id);

create table public.investment_orders (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "product_id" uuid not null,
  "direction" text not null check ("direction" in ('buy','redeem')),
  amount_amount_minor bigint not null check (amount_amount_minor >= 0),
  amount_currency text not null check (amount_currency in ('CNY','IDR','USD','SGD')),
  "status" text not null check ("status" in ('pending','completed','failed')),
  "idempotency_key" text not null,
  "initiated_by" uuid not null,
  "plan_id" uuid,
  "action_id" uuid,
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null,
  "audit_event_id" uuid not null,
  primary key (user_id, id),
  unique(user_id, idempotency_key),
  check (initiated_by = user_id)
);
alter table public.investment_orders enable row level security;
revoke all on public.investment_orders from public, anon, authenticated;
grant select on public.investment_orders to authenticated;
create policy investment_orders_read on public.investment_orders for select to authenticated using ((select auth.uid()) = user_id);
create index investment_orders_owner_idx on public.investment_orders (user_id);

create table public.tuition_obligations (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "institution" text not null,
  "installment" text not null,
  amount_amount_minor bigint not null check (amount_amount_minor >= 0),
  amount_currency text not null check (amount_currency in ('CNY','IDR','USD','SGD')),
  "due_at" timestamptz not null,
  paid_amount_amount_minor bigint not null check (paid_amount_amount_minor >= 0),
  paid_amount_currency text not null check (paid_amount_currency in ('CNY','IDR','USD','SGD')),
  check (paid_amount_currency = amount_currency),
  check (paid_amount_amount_minor <= amount_amount_minor),
  "status" text not null check ("status" in ('unpaid','partially-paid','paid')),
  primary key (user_id, id)
);
alter table public.tuition_obligations enable row level security;
revoke all on public.tuition_obligations from public, anon, authenticated;
grant select on public.tuition_obligations to authenticated;
create policy tuition_obligations_read on public.tuition_obligations for select to authenticated using ((select auth.uid()) = user_id);
create index tuition_obligations_owner_idx on public.tuition_obligations (user_id);

create table public.ai_conversations (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "title" text not null,
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null,
  primary key (user_id, id)
);
alter table public.ai_conversations enable row level security;
revoke all on public.ai_conversations from public, anon, authenticated;
grant select on public.ai_conversations to authenticated;
create policy ai_conversations_read on public.ai_conversations for select to authenticated using ((select auth.uid()) = user_id);
create index ai_conversations_owner_idx on public.ai_conversations (user_id);

create table public.ai_messages (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "conversation_id" uuid not null,
  "role" text not null check ("role" in ('user','assistant','tool')),
  "content" text not null,
  "metadata" jsonb,
  "created_at" timestamptz not null,
  primary key (user_id, id)
);
alter table public.ai_messages enable row level security;
revoke all on public.ai_messages from public, anon, authenticated;
grant select on public.ai_messages to authenticated;
create policy ai_messages_read on public.ai_messages for select to authenticated using ((select auth.uid()) = user_id);
create index ai_messages_owner_idx on public.ai_messages (user_id);

create table public.agent_plans (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "normalized_intent" text not null,
  "context_snapshot" jsonb,
  "calculations" jsonb,
  "status" text not null check ("status" in ('draft','awaiting-approval','approved','executed','failed','cancelled')),
  "version" integer not null check (version >= 0),
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null,
  primary key (user_id, id)
);
alter table public.agent_plans enable row level security;
revoke all on public.agent_plans from public, anon, authenticated;
grant select on public.agent_plans to authenticated;
create policy agent_plans_read on public.agent_plans for select to authenticated using ((select auth.uid()) = user_id);
create index agent_plans_owner_idx on public.agent_plans (user_id);

create table public.agent_actions (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "plan_id" uuid not null,
  "order" integer not null,
  "tool" text not null,
  "input" jsonb,
  "expected_impact" jsonb,
  "validation_result" jsonb,
  "execution_result" jsonb,
  primary key (user_id, id)
);
alter table public.agent_actions enable row level security;
revoke all on public.agent_actions from public, anon, authenticated;
grant select on public.agent_actions to authenticated;
create policy agent_actions_read on public.agent_actions for select to authenticated using ((select auth.uid()) = user_id);
create index agent_actions_owner_idx on public.agent_actions (user_id);

create table public.approval_records (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "action_id" uuid not null,
  "decision" text not null check ("decision" in ('approved','rejected')),
  "approved_payload_hash" text not null,
  "decided_at" timestamptz not null,
  "expires_at" timestamptz not null,
  primary key (user_id, id)
);
alter table public.approval_records enable row level security;
revoke all on public.approval_records from public, anon, authenticated;
grant select on public.approval_records to authenticated;
create policy approval_records_read on public.approval_records for select to authenticated using ((select auth.uid()) = user_id);
create index approval_records_owner_idx on public.approval_records (user_id);

create table public.audit_events (
  user_id uuid not null references auth.users(id),
  "id" uuid not null,
  "event_type" text not null,
  "actor_id" uuid not null,
  "target_id" uuid not null,
  "before_summary" jsonb,
  "after_summary" jsonb,
  "outcome" text not null check ("outcome" in ('success','failure')),
  "correlation_id" text not null,
  "occurred_at" timestamptz not null,
  primary key (user_id, id),
  check (actor_id = user_id)
);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from public, anon, authenticated;
grant select on public.audit_events to authenticated;
create policy audit_events_read on public.audit_events for select to authenticated using ((select auth.uid()) = user_id);
create index audit_events_owner_idx on public.audit_events (user_id);

alter table public.transactions add foreign key (user_id, account_id) references public.accounts(user_id, id) deferrable initially deferred;
alter table public.transactions add foreign key (user_id, transfer_id) references public.transfers(user_id, id) deferrable initially deferred;
alter table public.transactions add foreign key (user_id, investment_order_id) references public.investment_orders(user_id, id) deferrable initially deferred;
alter table public.transactions add foreign key (user_id, subscription_id) references public.subscriptions(user_id, id) deferrable initially deferred;
alter table public.transfers add foreign key (user_id, source_account_id) references public.accounts(user_id, id) deferrable initially deferred;
alter table public.transfers add foreign key (user_id, destination_account_id) references public.accounts(user_id, id) deferrable initially deferred;
alter table public.transfers add foreign key (user_id, beneficiary_id) references public.beneficiaries(user_id, id) deferrable initially deferred;
alter table public.transfers add foreign key (user_id, tuition_obligation_id) references public.tuition_obligations(user_id, id) deferrable initially deferred;
alter table public.transfers add foreign key (user_id, plan_id) references public.agent_plans(user_id, id) deferrable initially deferred;
alter table public.transfers add foreign key (user_id, action_id) references public.agent_actions(user_id, id) deferrable initially deferred;
alter table public.transfers add foreign key (user_id, audit_event_id) references public.audit_events(user_id, id) deferrable initially deferred;
alter table public.cards add foreign key (user_id, account_id) references public.accounts(user_id, id) deferrable initially deferred;
alter table public.card_restrictions add foreign key (user_id, card_id) references public.cards(user_id, id) deferrable initially deferred;
alter table public.holdings add foreign key (user_id, product_id) references public.investment_products(user_id, id) deferrable initially deferred;
alter table public.investment_orders add foreign key (user_id, product_id) references public.investment_products(user_id, id) deferrable initially deferred;
alter table public.investment_orders add foreign key (user_id, plan_id) references public.agent_plans(user_id, id) deferrable initially deferred;
alter table public.investment_orders add foreign key (user_id, action_id) references public.agent_actions(user_id, id) deferrable initially deferred;
alter table public.investment_orders add foreign key (user_id, audit_event_id) references public.audit_events(user_id, id) deferrable initially deferred;
alter table public.ai_messages add foreign key (user_id, conversation_id) references public.ai_conversations(user_id, id) deferrable initially deferred;
alter table public.agent_actions add foreign key (user_id, plan_id) references public.agent_plans(user_id, id) deferrable initially deferred;
alter table public.approval_records add foreign key (user_id, action_id) references public.agent_actions(user_id, id) deferrable initially deferred;
create index transactions_account_date_idx on public.transactions(user_id, account_id, occurred_at);
create index plans_status_idx on public.agent_plans(user_id, status);
create index actions_plan_order_idx on public.agent_actions(user_id, plan_id, "order");
-- Stored/generated status supports index pushdown under RLS without mutable duplication.
alter table public.agent_actions add execution_status text generated always as (execution_result->>'status') stored;
create index actions_execution_status_idx on public.agent_actions(user_id, execution_status);
create index subscriptions_renewal_idx on public.subscriptions(user_id, next_renewal_at);
create index audit_correlation_idx on public.audit_events(user_id, correlation_id);
create function public.read_financial_snapshot() returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  select jsonb_build_object('seedVersion', seed_version, 'asOf', as_of) into result from public.users where user_id = auth.uid();
  if result is null then raise exception 'Profile not provisioned'; end if;
  result := result || jsonb_build_object('users', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'profile', t."profile", 'home_currency', t."home_currency", 'locale', t."locale", 'risk_profile_ref', t."risk_profile_ref" ) order by t.id), '[]'::jsonb) from public.users t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('accounts', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'type', t."type", 'currency', t."currency", 'balance_amount_minor', t.balance_amount_minor::text, 'balance_currency', t.balance_currency, 'available_balance_amount_minor', t.available_balance_amount_minor::text, 'available_balance_currency', t.available_balance_currency, 'status', t."status", 'goal_amount_minor', t.goal_amount_minor::text, 'goal_currency', t.goal_currency ) order by t.id), '[]'::jsonb) from public.accounts t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('exchangeRates', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'base', t."base", 'quote', t."quote", 'rate', t."rate", 'provider', t."provider", 'reference_at', to_char(t."reference_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'retrieved_at', to_char(t."retrieved_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'source', t."source" ) order by t.id), '[]'::jsonb) from public.exchange_rates t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('beneficiaries', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'display_name', t."display_name", 'phone', t."phone", 'account_alias', t."account_alias", 'supported_currencies', t."supported_currencies", 'verification_state', t."verification_state" ) order by t.id), '[]'::jsonb) from public.beneficiaries t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('transactions', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'account_id', t."account_id", 'direction', t."direction", 'amount_amount_minor', t.amount_amount_minor::text, 'amount_currency', t.amount_currency, 'original_currency', t."original_currency", 'category', t."category", 'classification', t."classification", 'merchant', t."merchant", 'occurred_at', to_char(t."occurred_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'recorded_at', to_char(t."recorded_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'transfer_id', t."transfer_id", 'investment_order_id', t."investment_order_id", 'subscription_id', t."subscription_id", 'recurrence', t."recurrence", 'anomaly', t."anomaly" ) order by t.id), '[]'::jsonb) from public.transactions t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('transfers', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'source_account_id', t."source_account_id", 'destination_account_id', t."destination_account_id", 'beneficiary_id', t."beneficiary_id", 'tuition_obligation_id', t."tuition_obligation_id", 'amount_amount_minor', t.amount_amount_minor::text, 'amount_currency', t.amount_currency, 'currency', t."currency", 'scheduled_at', to_char(t."scheduled_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'status', t."status", 'receipt_ref', t."receipt_ref", 'idempotency_key', t."idempotency_key", 'initiated_by', t."initiated_by", 'plan_id', t."plan_id", 'action_id', t."action_id", 'created_at', to_char(t."created_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'updated_at', to_char(t."updated_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'audit_event_id', t."audit_event_id" ) order by t.id), '[]'::jsonb) from public.transfers t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('budgets', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'month', t."month", 'category', t."category", 'limit_amount_minor', t.limit_amount_minor::text, 'limit_currency', t.limit_currency, 'actual_spend_amount_minor', t.actual_spend_amount_minor::text, 'actual_spend_currency', t.actual_spend_currency, 'currency', t."currency", 'status', t."status" ) order by t.id), '[]'::jsonb) from public.budgets t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('cards', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'account_id', t."account_id", 'masked_number', t."masked_number", 'card_type', t."card_type", 'purpose', t."purpose", 'freeze_state', t."freeze_state", 'daily_limit_amount_minor', t.daily_limit_amount_minor::text, 'daily_limit_currency', t.daily_limit_currency, 'monthly_limit_amount_minor', t.monthly_limit_amount_minor::text, 'monthly_limit_currency', t.monthly_limit_currency ) order by t.id), '[]'::jsonb) from public.cards t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('cardRestrictions', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'card_id', t."card_id", 'merchant_category', t."merchant_category", 'state', t."state" ) order by t.id), '[]'::jsonb) from public.card_restrictions t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('subscriptions', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'merchant', t."merchant", 'amount_amount_minor', t.amount_amount_minor::text, 'amount_currency', t.amount_currency, 'currency', t."currency", 'cadence', t."cadence", 'next_renewal_at', to_char(t."next_renewal_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'last_usage_at', to_char(t."last_usage_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'status', t."status" ) order by t.id), '[]'::jsonb) from public.subscriptions t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('investmentProducts', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'name', t."name", 'fictional', t."fictional", 'category', t."category", 'simulated_risk', t."simulated_risk", 'fee_basis_points', t."fee_basis_points", 'liquidity', t."liquidity", 'historical_simulation', t."historical_simulation", 'disclaimer', t."disclaimer" ) order by t.id), '[]'::jsonb) from public.investment_products t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('holdings', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'product_id', t."product_id", 'units', t."units", 'cost_basis_amount_minor', t.cost_basis_amount_minor::text, 'cost_basis_currency', t.cost_basis_currency, 'simulated_value_amount_minor', t.simulated_value_amount_minor::text, 'simulated_value_currency', t.simulated_value_currency ) order by t.id), '[]'::jsonb) from public.holdings t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('investmentOrders', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'product_id', t."product_id", 'direction', t."direction", 'amount_amount_minor', t.amount_amount_minor::text, 'amount_currency', t.amount_currency, 'status', t."status", 'idempotency_key', t."idempotency_key", 'initiated_by', t."initiated_by", 'plan_id', t."plan_id", 'action_id', t."action_id", 'created_at', to_char(t."created_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'updated_at', to_char(t."updated_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'audit_event_id', t."audit_event_id" ) order by t.id), '[]'::jsonb) from public.investment_orders t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('tuitionObligations', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'institution', t."institution", 'installment', t."installment", 'amount_amount_minor', t.amount_amount_minor::text, 'amount_currency', t.amount_currency, 'due_at', to_char(t."due_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'paid_amount_amount_minor', t.paid_amount_amount_minor::text, 'paid_amount_currency', t.paid_amount_currency, 'status', t."status" ) order by t.id), '[]'::jsonb) from public.tuition_obligations t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('aiConversations', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'title', t."title", 'created_at', to_char(t."created_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'updated_at', to_char(t."updated_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ) order by t.id), '[]'::jsonb) from public.ai_conversations t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('aiMessages', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'conversation_id', t."conversation_id", 'role', t."role", 'content', t."content", 'metadata', t."metadata", 'created_at', to_char(t."created_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ) order by t.id), '[]'::jsonb) from public.ai_messages t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('agentPlans', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'normalized_intent', t."normalized_intent", 'context_snapshot', t."context_snapshot", 'calculations', t."calculations", 'status', t."status", 'version', t."version", 'created_at', to_char(t."created_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'updated_at', to_char(t."updated_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ) order by t.id), '[]'::jsonb) from public.agent_plans t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('agentActions', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'plan_id', t."plan_id", 'order', t."order", 'tool', t."tool", 'input', t."input", 'expected_impact', t."expected_impact", 'validation_result', t."validation_result", 'execution_result', t."execution_result" ) order by t.id), '[]'::jsonb) from public.agent_actions t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('approvalRecords', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'action_id', t."action_id", 'decision', t."decision", 'approved_payload_hash', t."approved_payload_hash", 'decided_at', to_char(t."decided_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'expires_at', to_char(t."expires_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ) order by t.id), '[]'::jsonb) from public.approval_records t where t.user_id = auth.uid()));
  result := result || jsonb_build_object('auditEvents', (select coalesce(jsonb_agg(jsonb_build_object('user_id', t.user_id, 'id', t."id", 'event_type', t."event_type", 'actor_id', t."actor_id", 'target_id', t."target_id", 'before_summary', t."before_summary", 'after_summary', t."after_summary", 'outcome', t."outcome", 'correlation_id', t."correlation_id", 'occurred_at', to_char(t."occurred_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ) order by t.id), '[]'::jsonb) from public.audit_events t where t.user_id = auth.uid()));
  return result;
end;
$$;
revoke all on function public.read_financial_snapshot() from public, anon, authenticated;
grant execute on function public.read_financial_snapshot() to authenticated;
create schema private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
-- Private/non-exposed definer is deliberately narrow: fixed identity and fixed seed.
create function private.reset_demo_data() returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid();
  p_snapshot jsonb := $seed${"seedVersion":"v1","asOf":"2026-10-14T00:00:00.000Z","users":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000001","profile":{"displayName":"Ayu Pratama","nationality":"Indonesian","institution":"Fudan University","city":"Shanghai"},"home_currency":"IDR","locale":"en-US","risk_profile_ref":"demo-moderate"}],"accounts":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000010","type":"daily","currency":"CNY","balance_amount_minor":"1865000","balance_currency":"CNY","available_balance_amount_minor":"1865000","available_balance_currency":"CNY","status":"active","goal_amount_minor":null,"goal_currency":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000011","type":"savings","currency":"CNY","balance_amount_minor":"1200000","balance_currency":"CNY","available_balance_amount_minor":"1200000","available_balance_currency":"CNY","status":"active","goal_amount_minor":"1500000","goal_currency":"CNY"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000012","type":"daily","currency":"IDR","balance_amount_minor":"2500000","balance_currency":"IDR","available_balance_amount_minor":"2500000","available_balance_currency":"IDR","status":"active","goal_amount_minor":null,"goal_currency":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000013","type":"daily","currency":"USD","balance_amount_minor":"65000","balance_currency":"USD","available_balance_amount_minor":"65000","available_balance_currency":"USD","status":"active","goal_amount_minor":null,"goal_currency":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000014","type":"daily","currency":"SGD","balance_amount_minor":"42000","balance_currency":"SGD","available_balance_amount_minor":"42000","available_balance_currency":"SGD","status":"active","goal_amount_minor":null,"goal_currency":null}],"exchangeRates":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000020","base":"CNY","quote":"IDR","rate":"2200.000000","provider":"Demo reference fixture (not live)","reference_at":"2026-10-01T00:00:00.000Z","retrieved_at":"2026-10-14T00:00:00.000Z","source":"fallback"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000021","base":"USD","quote":"CNY","rate":"7.100000","provider":"Demo reference fixture (not live)","reference_at":"2026-10-01T00:00:00.000Z","retrieved_at":"2026-10-14T00:00:00.000Z","source":"fallback"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000022","base":"SGD","quote":"CNY","rate":"5.400000","provider":"Demo reference fixture (not live)","reference_at":"2026-10-01T00:00:00.000Z","retrieved_at":"2026-10-14T00:00:00.000Z","source":"fallback"}],"beneficiaries":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000030","display_name":"Zhang Wei","phone":"+86 138 0000 0001","account_alias":"Demo Zhang CNY","supported_currencies":["CNY"],"verification_state":"verified"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000031","display_name":"Sari Pratama","phone":"+62 812 0000 0002","account_alias":"Demo Family IDR","supported_currencies":["IDR"],"verification_state":"verified"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000032","display_name":"Li Mei","phone":"+86 138 0000 0003","account_alias":"Demo Li CNY","supported_currencies":["CNY","USD"],"verification_state":"verified"}],"transactions":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000101","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"280000","amount_currency":"CNY","original_currency":"CNY","category":"rent","classification":"consumption","merchant":"Shanghai Student Housing","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000102","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"115000","amount_currency":"CNY","original_currency":"CNY","category":"food","classification":"consumption","merchant":"Campus Dining","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000103","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"10000","amount_currency":"CNY","original_currency":"CNY","category":"food","classification":"consumption","merchant":"Late-night Delivery","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":"Unusually large food purchase"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000104","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"26000","amount_currency":"CNY","original_currency":"CNY","category":"transportation","classification":"consumption","merchant":"Shanghai Transit","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000105","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"38000","amount_currency":"CNY","original_currency":"CNY","category":"shopping","classification":"consumption","merchant":"Campus Store","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000106","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"20000","amount_currency":"CNY","original_currency":"CNY","category":"shopping","classification":"consumption","merchant":"Online Marketplace","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":"Shopping spike"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000107","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"6800","amount_currency":"CNY","original_currency":"CNY","category":"other","classification":"consumption","merchant":"Campus Video","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":"00000000-0000-4000-8000-000000000050","recurrence":{"cadence":"monthly","nextOccurrenceAt":"2026-11-05T08:00:00.000Z"},"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000108","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"1800","amount_currency":"CNY","original_currency":"CNY","category":"other","classification":"consumption","merchant":"Campus Music","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":"00000000-0000-4000-8000-000000000051","recurrence":{"cadence":"monthly","nextOccurrenceAt":"2026-11-05T08:00:00.000Z"},"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000109","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"2400","amount_currency":"CNY","original_currency":"CNY","category":"other","classification":"consumption","merchant":"Campus Cloud","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":"00000000-0000-4000-8000-000000000052","recurrence":{"cadence":"monthly","nextOccurrenceAt":"2026-11-05T08:00:00.000Z"},"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000110","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"4000","amount_currency":"CNY","original_currency":"CNY","category":"other","classification":"consumption","merchant":"Campus Study","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":"00000000-0000-4000-8000-000000000053","recurrence":{"cadence":"monthly","nextOccurrenceAt":"2026-11-05T08:00:00.000Z"},"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000111","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"16000","amount_currency":"CNY","original_currency":"CNY","category":"other","classification":"consumption","merchant":"Campus Services","occurred_at":"2026-10-05T08:00:00.000Z","recorded_at":"2026-10-05T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000112","account_id":"00000000-0000-4000-8000-000000000010","direction":"credit","amount_amount_minor":"2485000","amount_currency":"CNY","original_currency":"CNY","category":"scholarship","classification":"income","merchant":"Fictional Student Scholarship","occurred_at":"2026-10-01T08:00:00.000Z","recorded_at":"2026-10-01T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000113","account_id":"00000000-0000-4000-8000-000000000012","direction":"credit","amount_amount_minor":"10000000","amount_currency":"IDR","original_currency":"IDR","category":"family-allowance","classification":"income","merchant":"Family Allowance","occurred_at":"2026-10-01T08:00:00.000Z","recorded_at":"2026-10-01T08:00:00.000Z","transfer_id":null,"investment_order_id":null,"subscription_id":null,"recurrence":{"cadence":"monthly","nextOccurrenceAt":"2026-11-01T08:00:00.000Z"},"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000114","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"50000","amount_currency":"CNY","original_currency":"CNY","category":"transfer","classification":"internal-transfer","merchant":"Savings Transfer","occurred_at":"2026-10-01T08:00:00.000Z","recorded_at":"2026-10-01T08:00:00.000Z","transfer_id":"00000000-0000-4000-8000-000000000070","investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000115","account_id":"00000000-0000-4000-8000-000000000011","direction":"credit","amount_amount_minor":"50000","amount_currency":"CNY","original_currency":"CNY","category":"transfer","classification":"internal-transfer","merchant":"Savings Transfer","occurred_at":"2026-10-01T08:00:00.000Z","recorded_at":"2026-10-01T08:00:00.000Z","transfer_id":"00000000-0000-4000-8000-000000000070","investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000116","account_id":"00000000-0000-4000-8000-000000000010","direction":"debit","amount_amount_minor":"50000","amount_currency":"CNY","original_currency":"CNY","category":"investment","classification":"asset-movement","merchant":"Demo Money Market Buy","occurred_at":"2026-10-01T08:00:00.000Z","recorded_at":"2026-10-01T08:00:00.000Z","transfer_id":null,"investment_order_id":"00000000-0000-4000-8000-000000000071","subscription_id":null,"recurrence":null,"anomaly":null},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000117","account_id":"00000000-0000-4000-8000-000000000012","direction":"debit","amount_amount_minor":"7500000","amount_currency":"IDR","original_currency":"IDR","category":"transfer","classification":"external-transfer","merchant":"Family Remittance","occurred_at":"2026-10-01T08:00:00.000Z","recorded_at":"2026-10-01T08:00:00.000Z","transfer_id":"00000000-0000-4000-8000-000000000072","investment_order_id":null,"subscription_id":null,"recurrence":null,"anomaly":null}],"transfers":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000070","source_account_id":"00000000-0000-4000-8000-000000000010","destination_account_id":"00000000-0000-4000-8000-000000000011","beneficiary_id":null,"tuition_obligation_id":null,"amount_amount_minor":"50000","amount_currency":"CNY","currency":"CNY","scheduled_at":null,"status":"completed","receipt_ref":"DEMO-SAVINGS-001","idempotency_key":"seed:v1:savings-transfer","initiated_by":"00000000-0000-4000-8000-000000000001","plan_id":null,"action_id":null,"created_at":"2026-10-01T08:00:00.000Z","updated_at":"2026-10-01T08:00:00.000Z","audit_event_id":"00000000-0000-4000-8000-000000000090"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000072","source_account_id":"00000000-0000-4000-8000-000000000012","destination_account_id":null,"beneficiary_id":"00000000-0000-4000-8000-000000000031","tuition_obligation_id":null,"amount_amount_minor":"7500000","amount_currency":"IDR","currency":"IDR","scheduled_at":null,"status":"completed","receipt_ref":"DEMO-REMITTANCE-001","idempotency_key":"seed:v1:family-remittance","initiated_by":"00000000-0000-4000-8000-000000000001","plan_id":null,"action_id":null,"created_at":"2026-10-01T08:00:00.000Z","updated_at":"2026-10-01T08:00:00.000Z","audit_event_id":"00000000-0000-4000-8000-000000000092"}],"budgets":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000040","month":"2026-10","category":"rent","limit_amount_minor":"280000","limit_currency":"CNY","actual_spend_amount_minor":"280000","actual_spend_currency":"CNY","currency":"CNY","status":"within-limit"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000041","month":"2026-10","category":"food","limit_amount_minor":"125000","limit_currency":"CNY","actual_spend_amount_minor":"125000","actual_spend_currency":"CNY","currency":"CNY","status":"within-limit"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000042","month":"2026-10","category":"transportation","limit_amount_minor":"26000","limit_currency":"CNY","actual_spend_amount_minor":"26000","actual_spend_currency":"CNY","currency":"CNY","status":"within-limit"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000043","month":"2026-10","category":"shopping","limit_amount_minor":"58000","limit_currency":"CNY","actual_spend_amount_minor":"58000","actual_spend_currency":"CNY","currency":"CNY","status":"within-limit"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000044","month":"2026-10","category":"other","limit_amount_minor":"31000","limit_currency":"CNY","actual_spend_amount_minor":"31000","actual_spend_currency":"CNY","currency":"CNY","status":"within-limit"}],"cards":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000060","account_id":"00000000-0000-4000-8000-000000000010","masked_number":"•••• 1201","card_type":"virtual","purpose":"daily","freeze_state":"active","daily_limit_amount_minor":"200000","daily_limit_currency":"CNY","monthly_limit_amount_minor":"800000","monthly_limit_currency":"CNY"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000061","account_id":"00000000-0000-4000-8000-000000000010","masked_number":"•••• 1202","card_type":"virtual","purpose":"online-shopping","freeze_state":"active","daily_limit_amount_minor":"100000","daily_limit_currency":"CNY","monthly_limit_amount_minor":"300000","monthly_limit_currency":"CNY"}],"cardRestrictions":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000062","card_id":"00000000-0000-4000-8000-000000000061","merchant_category":"gambling","state":"deny"}],"subscriptions":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000050","merchant":"Campus Video","amount_amount_minor":"6800","amount_currency":"CNY","currency":"CNY","cadence":"monthly","next_renewal_at":"2026-11-05T08:00:00.000Z","last_usage_at":null,"status":"active"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000051","merchant":"Campus Music","amount_amount_minor":"1800","amount_currency":"CNY","currency":"CNY","cadence":"monthly","next_renewal_at":"2026-11-05T08:00:00.000Z","last_usage_at":"2026-10-13T08:00:00.000Z","status":"active"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000052","merchant":"Campus Cloud","amount_amount_minor":"2400","amount_currency":"CNY","currency":"CNY","cadence":"monthly","next_renewal_at":"2026-11-05T08:00:00.000Z","last_usage_at":"2026-10-12T08:00:00.000Z","status":"active"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000053","merchant":"Campus Study","amount_amount_minor":"4000","amount_currency":"CNY","currency":"CNY","cadence":"monthly","next_renewal_at":"2026-11-05T08:00:00.000Z","last_usage_at":"2026-10-14T00:00:00.000Z","status":"active"}],"investmentProducts":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000080","name":"Demo Campus Cash","fictional":true,"category":"money-market","simulated_risk":"low","fee_basis_points":10,"liquidity":"daily","historical_simulation":{"period":"2025 fictional simulation","returnBasisPoints":180,"drawdownBasisPoints":5},"disclaimer":"Fictional simulation only; not an investment recommendation or guaranteed return."},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000081","name":"Demo Campus Bond","fictional":true,"category":"bond","simulated_risk":"low","fee_basis_points":25,"liquidity":"t-plus-2","historical_simulation":{"period":"2025 fictional simulation","returnBasisPoints":320,"drawdownBasisPoints":180},"disclaimer":"Fictional simulation only; not an investment recommendation or guaranteed return."},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000082","name":"Demo Campus Balanced","fictional":true,"category":"balanced","simulated_risk":"medium","fee_basis_points":40,"liquidity":"t-plus-2","historical_simulation":{"period":"2025 fictional simulation","returnBasisPoints":480,"drawdownBasisPoints":700},"disclaimer":"Fictional simulation only; not an investment recommendation or guaranteed return."},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000083","name":"Demo Campus Equity Index","fictional":true,"category":"equity-index","simulated_risk":"high","fee_basis_points":30,"liquidity":"t-plus-2","historical_simulation":{"period":"2025 fictional simulation","returnBasisPoints":650,"drawdownBasisPoints":1800},"disclaimer":"Fictional simulation only; not an investment recommendation or guaranteed return."}],"holdings":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000084","product_id":"00000000-0000-4000-8000-000000000080","units":"500.000000","cost_basis_amount_minor":"50000","cost_basis_currency":"CNY","simulated_value_amount_minor":"50000","simulated_value_currency":"CNY"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000085","product_id":"00000000-0000-4000-8000-000000000081","units":"1000.000000","cost_basis_amount_minor":"100000","cost_basis_currency":"CNY","simulated_value_amount_minor":"103200","simulated_value_currency":"CNY"}],"investmentOrders":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000071","product_id":"00000000-0000-4000-8000-000000000080","direction":"buy","amount_amount_minor":"50000","amount_currency":"CNY","status":"completed","idempotency_key":"seed:v1:money-market-buy","initiated_by":"00000000-0000-4000-8000-000000000001","plan_id":null,"action_id":null,"created_at":"2026-10-01T08:00:00.000Z","updated_at":"2026-10-01T08:00:00.000Z","audit_event_id":"00000000-0000-4000-8000-000000000091"}],"tuitionObligations":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000086","institution":"Fudan University","installment":"Autumn installment","amount_amount_minor":"500000","amount_currency":"CNY","due_at":"2026-11-01T00:00:00.000Z","paid_amount_amount_minor":"0","paid_amount_currency":"CNY","status":"unpaid"}],"aiConversations":[],"aiMessages":[],"agentPlans":[],"agentActions":[],"approvalRecords":[],"auditEvents":[{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000090","event_type":"transfer.completed","actor_id":"00000000-0000-4000-8000-000000000001","target_id":"00000000-0000-4000-8000-000000000070","before_summary":null,"after_summary":{"receiptRef":"DEMO-SAVINGS-001"},"outcome":"success","correlation_id":"seed:v1:savings-transfer","occurred_at":"2026-10-01T08:00:00.000Z"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000091","event_type":"investment-order.completed","actor_id":"00000000-0000-4000-8000-000000000001","target_id":"00000000-0000-4000-8000-000000000071","before_summary":null,"after_summary":{"productId":"00000000-0000-4000-8000-000000000080"},"outcome":"success","correlation_id":"seed:v1:money-market-buy","occurred_at":"2026-10-01T08:00:00.000Z"},{"user_id":"00000000-0000-4000-8000-000000000001","id":"00000000-0000-4000-8000-000000000092","event_type":"transfer.completed","actor_id":"00000000-0000-4000-8000-000000000001","target_id":"00000000-0000-4000-8000-000000000072","before_summary":null,"after_summary":{"receiptRef":"DEMO-REMITTANCE-001"},"outcome":"success","correlation_id":"seed:v1:family-remittance","occurred_at":"2026-10-01T08:00:00.000Z"}]}$seed$::jsonb;
begin
  if owner is distinct from '00000000-0000-4000-8000-000000000001'::uuid or not exists (select 1 from public.users where user_id = owner and is_demo) then raise exception 'Only an enrolled demo user can reset'; end if;
  perform 1 from public.users where user_id = owner for update;
  set constraints all deferred;
  delete from public.approval_records where user_id = owner;
  delete from public.agent_actions where user_id = owner;
  delete from public.agent_plans where user_id = owner;
  delete from public.ai_messages where user_id = owner;
  delete from public.ai_conversations where user_id = owner;
  delete from public.tuition_obligations where user_id = owner;
  delete from public.investment_orders where user_id = owner;
  delete from public.holdings where user_id = owner;
  delete from public.investment_products where user_id = owner;
  delete from public.subscriptions where user_id = owner;
  delete from public.card_restrictions where user_id = owner;
  delete from public.cards where user_id = owner;
  delete from public.budgets where user_id = owner;
  delete from public.transfers where user_id = owner;
  delete from public.transactions where user_id = owner;
  delete from public.beneficiaries where user_id = owner;
  delete from public.exchange_rates where user_id = owner;
  delete from public.accounts where user_id = owner;
  update public.users set seed_version = p_snapshot->>'seedVersion', as_of = p_snapshot->>'asOf' where user_id = owner;
  insert into public.accounts ("user_id", "id", "type", "currency", "balance_amount_minor", "balance_currency", "available_balance_amount_minor", "available_balance_currency", "status", "goal_amount_minor", "goal_currency") select "user_id", "id", "type", "currency", "balance_amount_minor", "balance_currency", "available_balance_amount_minor", "available_balance_currency", "status", "goal_amount_minor", "goal_currency" from pg_catalog.jsonb_populate_recordset(null::public.accounts, p_snapshot->'accounts');
  insert into public.exchange_rates ("user_id", "id", "base", "quote", "rate", "provider", "reference_at", "retrieved_at", "source") select "user_id", "id", "base", "quote", "rate", "provider", "reference_at", "retrieved_at", "source" from pg_catalog.jsonb_populate_recordset(null::public.exchange_rates, p_snapshot->'exchangeRates');
  insert into public.beneficiaries ("user_id", "id", "display_name", "phone", "account_alias", "supported_currencies", "verification_state") select "user_id", "id", "display_name", "phone", "account_alias", "supported_currencies", "verification_state" from pg_catalog.jsonb_populate_recordset(null::public.beneficiaries, p_snapshot->'beneficiaries');
  insert into public.transactions ("user_id", "id", "account_id", "direction", "amount_amount_minor", "amount_currency", "original_currency", "category", "classification", "merchant", "occurred_at", "recorded_at", "transfer_id", "investment_order_id", "subscription_id", "recurrence", "anomaly") select "user_id", "id", "account_id", "direction", "amount_amount_minor", "amount_currency", "original_currency", "category", "classification", "merchant", "occurred_at", "recorded_at", "transfer_id", "investment_order_id", "subscription_id", "recurrence", "anomaly" from pg_catalog.jsonb_populate_recordset(null::public.transactions, p_snapshot->'transactions');
  insert into public.transfers ("user_id", "id", "source_account_id", "destination_account_id", "beneficiary_id", "tuition_obligation_id", "amount_amount_minor", "amount_currency", "currency", "scheduled_at", "status", "receipt_ref", "idempotency_key", "initiated_by", "plan_id", "action_id", "created_at", "updated_at", "audit_event_id") select "user_id", "id", "source_account_id", "destination_account_id", "beneficiary_id", "tuition_obligation_id", "amount_amount_minor", "amount_currency", "currency", "scheduled_at", "status", "receipt_ref", "idempotency_key", "initiated_by", "plan_id", "action_id", "created_at", "updated_at", "audit_event_id" from pg_catalog.jsonb_populate_recordset(null::public.transfers, p_snapshot->'transfers');
  insert into public.budgets ("user_id", "id", "month", "category", "limit_amount_minor", "limit_currency", "actual_spend_amount_minor", "actual_spend_currency", "currency", "status") select "user_id", "id", "month", "category", "limit_amount_minor", "limit_currency", "actual_spend_amount_minor", "actual_spend_currency", "currency", "status" from pg_catalog.jsonb_populate_recordset(null::public.budgets, p_snapshot->'budgets');
  insert into public.cards ("user_id", "id", "account_id", "masked_number", "card_type", "purpose", "freeze_state", "daily_limit_amount_minor", "daily_limit_currency", "monthly_limit_amount_minor", "monthly_limit_currency") select "user_id", "id", "account_id", "masked_number", "card_type", "purpose", "freeze_state", "daily_limit_amount_minor", "daily_limit_currency", "monthly_limit_amount_minor", "monthly_limit_currency" from pg_catalog.jsonb_populate_recordset(null::public.cards, p_snapshot->'cards');
  insert into public.card_restrictions ("user_id", "id", "card_id", "merchant_category", "state") select "user_id", "id", "card_id", "merchant_category", "state" from pg_catalog.jsonb_populate_recordset(null::public.card_restrictions, p_snapshot->'cardRestrictions');
  insert into public.subscriptions ("user_id", "id", "merchant", "amount_amount_minor", "amount_currency", "currency", "cadence", "next_renewal_at", "last_usage_at", "status") select "user_id", "id", "merchant", "amount_amount_minor", "amount_currency", "currency", "cadence", "next_renewal_at", "last_usage_at", "status" from pg_catalog.jsonb_populate_recordset(null::public.subscriptions, p_snapshot->'subscriptions');
  insert into public.investment_products ("user_id", "id", "name", "fictional", "category", "simulated_risk", "fee_basis_points", "liquidity", "historical_simulation", "disclaimer") select "user_id", "id", "name", "fictional", "category", "simulated_risk", "fee_basis_points", "liquidity", "historical_simulation", "disclaimer" from pg_catalog.jsonb_populate_recordset(null::public.investment_products, p_snapshot->'investmentProducts');
  insert into public.holdings ("user_id", "id", "product_id", "units", "cost_basis_amount_minor", "cost_basis_currency", "simulated_value_amount_minor", "simulated_value_currency") select "user_id", "id", "product_id", "units", "cost_basis_amount_minor", "cost_basis_currency", "simulated_value_amount_minor", "simulated_value_currency" from pg_catalog.jsonb_populate_recordset(null::public.holdings, p_snapshot->'holdings');
  insert into public.investment_orders ("user_id", "id", "product_id", "direction", "amount_amount_minor", "amount_currency", "status", "idempotency_key", "initiated_by", "plan_id", "action_id", "created_at", "updated_at", "audit_event_id") select "user_id", "id", "product_id", "direction", "amount_amount_minor", "amount_currency", "status", "idempotency_key", "initiated_by", "plan_id", "action_id", "created_at", "updated_at", "audit_event_id" from pg_catalog.jsonb_populate_recordset(null::public.investment_orders, p_snapshot->'investmentOrders');
  insert into public.tuition_obligations ("user_id", "id", "institution", "installment", "amount_amount_minor", "amount_currency", "due_at", "paid_amount_amount_minor", "paid_amount_currency", "status") select "user_id", "id", "institution", "installment", "amount_amount_minor", "amount_currency", "due_at", "paid_amount_amount_minor", "paid_amount_currency", "status" from pg_catalog.jsonb_populate_recordset(null::public.tuition_obligations, p_snapshot->'tuitionObligations');
  insert into public.ai_conversations ("user_id", "id", "title", "created_at", "updated_at") select "user_id", "id", "title", "created_at", "updated_at" from pg_catalog.jsonb_populate_recordset(null::public.ai_conversations, p_snapshot->'aiConversations');
  insert into public.ai_messages ("user_id", "id", "conversation_id", "role", "content", "metadata", "created_at") select "user_id", "id", "conversation_id", "role", "content", "metadata", "created_at" from pg_catalog.jsonb_populate_recordset(null::public.ai_messages, p_snapshot->'aiMessages');
  insert into public.agent_plans ("user_id", "id", "normalized_intent", "context_snapshot", "calculations", "status", "version", "created_at", "updated_at") select "user_id", "id", "normalized_intent", "context_snapshot", "calculations", "status", "version", "created_at", "updated_at" from pg_catalog.jsonb_populate_recordset(null::public.agent_plans, p_snapshot->'agentPlans');
  insert into public.agent_actions ("user_id", "id", "plan_id", "order", "tool", "input", "expected_impact", "validation_result", "execution_result") select "user_id", "id", "plan_id", "order", "tool", "input", "expected_impact", "validation_result", "execution_result" from pg_catalog.jsonb_populate_recordset(null::public.agent_actions, p_snapshot->'agentActions');
  insert into public.approval_records ("user_id", "id", "action_id", "decision", "approved_payload_hash", "decided_at", "expires_at") select "user_id", "id", "action_id", "decision", "approved_payload_hash", "decided_at", "expires_at" from pg_catalog.jsonb_populate_recordset(null::public.approval_records, p_snapshot->'approvalRecords');
  insert into public.audit_events select * from pg_catalog.jsonb_populate_recordset(null::public.audit_events, p_snapshot->'auditEvents') on conflict (user_id, id) do nothing;
  insert into public.audit_events (user_id,id,event_type,actor_id,target_id,before_summary,after_summary,outcome,correlation_id,occurred_at)
    values (owner,pg_catalog.gen_random_uuid(),'demo.reset',owner,owner,'{}',jsonb_build_object('seedVersion',p_snapshot->>'seedVersion'),'success',pg_catalog.gen_random_uuid()::text,pg_catalog.now());
  return public.read_financial_snapshot();
end;
$$;
revoke all on function private.reset_demo_data() from public, anon, authenticated;
grant execute on function private.reset_demo_data() to authenticated;
create function public.reset_demo_data() returns jsonb language sql security invoker set search_path = '' as $$
  select private.reset_demo_data();
$$;
revoke all on function public.reset_demo_data() from public, anon, authenticated;
grant execute on function public.reset_demo_data() to authenticated;
commit;
