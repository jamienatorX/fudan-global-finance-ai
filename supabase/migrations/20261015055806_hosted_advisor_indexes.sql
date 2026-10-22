-- Cover the 19 foreign-key paths identified by the hosted performance advisor.
-- transactions(user_id, account_id) is already covered by transactions_account_date_idx.
-- agent_actions(user_id, plan_id) is already covered by actions_plan_order_idx.
-- Reuse those wider indexes instead of creating redundant two-column indexes.
begin;

create index ai_messages_owner_conversation_idx on public.ai_messages using btree (user_id, conversation_id);
create index approval_records_owner_action_idx on public.approval_records using btree (user_id, action_id);
create index card_restrictions_owner_card_idx on public.card_restrictions using btree (user_id, card_id);
create index cards_owner_account_idx on public.cards using btree (user_id, account_id);
create index holdings_owner_product_idx on public.holdings using btree (user_id, product_id);

create index investment_orders_owner_action_idx on public.investment_orders using btree (user_id, action_id);
create index investment_orders_owner_audit_idx on public.investment_orders using btree (user_id, audit_event_id);
create index investment_orders_owner_plan_idx on public.investment_orders using btree (user_id, plan_id);
create index investment_orders_owner_product_idx on public.investment_orders using btree (user_id, product_id);

create index transactions_owner_investment_order_idx on public.transactions using btree (user_id, investment_order_id);
create index transactions_owner_subscription_idx on public.transactions using btree (user_id, subscription_id);
create index transactions_owner_transfer_idx on public.transactions using btree (user_id, transfer_id);

create index transfers_owner_action_idx on public.transfers using btree (user_id, action_id);
create index transfers_owner_audit_idx on public.transfers using btree (user_id, audit_event_id);
create index transfers_owner_beneficiary_idx on public.transfers using btree (user_id, beneficiary_id);
create index transfers_owner_destination_account_idx on public.transfers using btree (user_id, destination_account_id);
create index transfers_owner_plan_idx on public.transfers using btree (user_id, plan_id);
create index transfers_owner_source_account_idx on public.transfers using btree (user_id, source_account_id);
create index transfers_owner_tuition_obligation_idx on public.transfers using btree (user_id, tuition_obligation_id);

commit;
