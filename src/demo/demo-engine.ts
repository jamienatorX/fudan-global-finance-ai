import type { Account, AuditEvent, FinancialSnapshot, Transaction } from '../domain/entities';
import { money } from '../domain/money';

export type DemoAction =
 | Readonly<{ type: 'transfer'; sourceId: string; destinationId?: string; beneficiaryId?: string; amountMinor: string; scheduledAt?: string }>
 | Readonly<{ type: 'tuition'; sourceId: string; tuitionId: string }>
 | Readonly<{ type: 'budget'; category: 'rent' | 'food' | 'transportation' | 'shopping' | 'other'; limitMinor: string }>
 | Readonly<{ type: 'card'; cardId: string; mode: 'freeze' | 'unfreeze' | 'limit'; limitMinor?: string }>
 | Readonly<{ type: 'subscription'; subscriptionId: string }>
 | Readonly<{ type: 'investment'; productId: string; sourceId: string; direction: 'buy' | 'redeem'; amountMinor: string }>;

export type DemoResult = Readonly<{ status: 'executed' | 'failed' | 'rejected'; message: string; action: DemoAction; id: string }>;
export type PreparedAction = Readonly<{ id: string; action: DemoAction; preparedAt: number; expiresAt: number; version: number }>;
export type DemoBatchStep = Readonly<{ id: string; action: DemoAction; approved: boolean }>;

function positive(value: string): bigint {
  if (!/^\d+$/.test(value)) throw new Error('Amount must contain integer minor units');
  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > 1_000_000_000_000n) throw new Error('Amount must be positive and within the simulation limit');
  return parsed;
}
function accountFor(snapshot: FinancialSnapshot, id: string): Account {
  const found = snapshot.accounts.find(a => a.id === id && a.ownerId === snapshot.users[0].id && a.status === 'active');
  if (!found) throw new Error('Source account is not available');
  return found;
}
function withDebit(snapshot: FinancialSnapshot, id: string, amount: bigint): readonly Account[] {
  const source = accountFor(snapshot, id);
  if (source.availableBalance.amountMinor < amount) throw new Error('Insufficient available balance');
  return snapshot.accounts.map(a => a.id === id ? { ...a,
    balance: money(a.balance.amountMinor - amount, a.currency),
    availableBalance: money(a.availableBalance.amountMinor - amount, a.currency) } : a);
}
function appendAudit(snapshot: FinancialSnapshot, next: FinancialSnapshot, id: string, type: string, message: string): FinancialSnapshot {
  const event: AuditEvent = {
    id, ownerId: snapshot.users[0].id, actorId: snapshot.users[0].id,
    eventType: type, targetId: id,
    beforeSummary: { version: snapshot.auditEvents.length },
    afterSummary: { summary: message }, outcome: 'success',
    correlationId: id, occurredAt: new Date().toISOString(),
  };
  return { ...next, auditEvents: [...next.auditEvents, event] };
}
function ledger(snapshot: FinancialSnapshot, id: string, account: Account, direction: Transaction['direction'],
  amount: bigint, classification: Transaction['classification'], category: Transaction['category'], merchant: string,
  transferId: string | null = null, investmentOrderId: string | null = null): Transaction {
  const now = new Date().toISOString();
  return {
    id, ownerId: snapshot.users[0].id, accountId: account.id, direction,
    amount: money(amount, account.currency), originalCurrency: account.currency,
    classification, category, merchant, occurredAt: now, recordedAt: now,
    transferId, investmentOrderId, subscriptionId: null, recurrence: null, anomaly: null,
  };
}

/** Pure, simulated ledger change. No network, no real banking rails. */
export function applyDemoAction(snapshot: FinancialSnapshot, action: DemoAction, id: string): Readonly<{ snapshot: FinancialSnapshot; message: string }> {
  if (snapshot.auditEvents.some(event => event.correlationId === id)) {
    return { snapshot, message: 'Already executed. No duplicate change.' };
  }
  const now = new Date().toISOString();
  let next: FinancialSnapshot;
  let message = '';
  switch (action.type) {
    case 'transfer': {
      const source = accountFor(snapshot, action.sourceId);
      const amount = positive(action.amountMinor);
      if (action.destinationId && action.beneficiaryId) throw new Error('Choose a single destination');
      const destination = action.destinationId ? accountFor(snapshot, action.destinationId) : null;
      const beneficiary = action.beneficiaryId ? snapshot.beneficiaries.find(b => b.id === action.beneficiaryId && b.ownerId === source.ownerId && b.verificationState === 'verified') : null;
      if (!destination && !beneficiary) throw new Error('Select a verified recipient or owned account');
      if (destination && (source.id === destination.id || destination.currency !== source.currency)) throw new Error('Internal transfer requires distinct same-currency accounts');
      if (beneficiary && !beneficiary.supportedCurrencies.includes(source.currency)) throw new Error('Recipient cannot receive this currency');
      const date = action.scheduledAt ? Date.parse(action.scheduledAt) : null;
      if (action.scheduledAt && (!Number.isFinite(date) || date! <= Date.now())) throw new Error('Scheduled time must be in the future');
      const scheduled = date !== null;
      const accounts = scheduled ? snapshot.accounts : destination
        ? withDebit({ ...snapshot, accounts: snapshot.accounts.map(a => a.id === destination.id ? {
          ...a, balance: money(a.balance.amountMinor + amount, a.currency), availableBalance: money(a.availableBalance.amountMinor + amount, a.currency),
        } : a) }, source.id, amount) : withDebit(snapshot, source.id, amount);
      const txs = scheduled ? [] : [
        ledger(snapshot, id + '-debit', source, 'debit', amount,
          destination ? 'internal-transfer' : 'external-transfer', 'transfer', destination ? 'Own account transfer' : beneficiary!.displayName, id),
        ...(destination ? [ledger(snapshot, id + '-credit', destination, 'credit', amount, 'internal-transfer', 'transfer', 'Own account transfer', id)] : []),
      ];
      next = { ...snapshot, accounts, transactions: [...snapshot.transactions, ...txs], transfers: [...snapshot.transfers, {
        id, ownerId: source.ownerId, sourceAccountId: source.id, destinationAccountId: destination?.id ?? null,
        beneficiaryId: beneficiary?.id ?? null, tuitionObligationId: null, amount: money(amount, source.currency),
        currency: source.currency, scheduledAt: action.scheduledAt ?? null, status: scheduled ? 'scheduled' : 'completed',
        receiptRef: 'DEMO-' + id.slice(0, 8).toUpperCase(), idempotencyKey: id, initiatedBy: source.ownerId,
        planId: null, actionId: null, createdAt: now, updatedAt: now, auditEventId: id,
      }] };
      message = scheduled ? 'Transfer scheduled for demo only; no funds debited yet.' : 'Simulated transfer completed. Receipt DEMO-' + id.slice(0, 8).toUpperCase();
      break;
    }
    case 'tuition': {
      const account = accountFor(snapshot, action.sourceId);
      const obligation = snapshot.tuitionObligations.find(t => t.id === action.tuitionId && t.ownerId === account.ownerId);
      if (!obligation || obligation.status === 'paid' || obligation.amount.currency !== account.currency) throw new Error('Unpaid tuition not available in this currency');
      const due = obligation.amount.amountMinor - obligation.paidAmount.amountMinor;
      if (due <= 0n) throw new Error('Tuition already paid');
      const accounts = withDebit(snapshot, account.id, due);
      next = { ...snapshot, accounts, tuitionObligations: snapshot.tuitionObligations.map(t => t.id === obligation.id ? { ...t, paidAmount: t.amount, status: 'paid' as const } : t),
        transactions: [...snapshot.transactions, ledger(snapshot, id + '-debit', account, 'debit', due, 'external-transfer', 'other', 'Fudan University tuition', id)],
        transfers: [...snapshot.transfers, { id, ownerId: account.ownerId, sourceAccountId: account.id, destinationAccountId: null, beneficiaryId: null,
          tuitionObligationId: obligation.id, amount: money(due, account.currency), currency: account.currency, scheduledAt: null,
          status: 'completed', receiptRef: 'DEMO-TUITION-' + id.slice(0, 8), idempotencyKey: id, initiatedBy: account.ownerId,
          planId: null, actionId: null, createdAt: now, updatedAt: now, auditEventId: id }] };
      message = 'Simulated tuition payment recorded; one-time obligation cleared.';
      break;
    }
    case 'budget': {
      const limit = positive(action.limitMinor);
      const current = snapshot.budgets.find(b => b.month === snapshot.asOf.slice(0, 7) && b.category === action.category && b.currency === 'CNY');
      if (!current) throw new Error('Budget category is missing');
      next = { ...snapshot, budgets: snapshot.budgets.map(b => b.id === current.id ? {
        ...b, limit: money(limit, b.currency), status: b.actualSpend.amountMinor > limit ? 'over-limit' as const : 'within-limit' as const,
      } : b) };
      message = 'Budget limit updated for ' + action.category + '.';
      break;
    }
    case 'card': {
      const card = snapshot.cards.find(c => c.id === action.cardId && c.ownerId === snapshot.users[0].id);
      if (!card) throw new Error('Card does not belong to the demo profile');
      if (action.mode === 'limit' && !action.limitMinor) throw new Error('New limit required');
      const limit = action.mode === 'limit' ? positive(action.limitMinor!) : null;
      next = { ...snapshot, cards: snapshot.cards.map(c => c.id === card.id ? {
        ...c, freezeState: action.mode === 'freeze' ? 'frozen' as const : action.mode === 'unfreeze' ? 'active' as const : c.freezeState,
        monthlyLimit: limit === null ? c.monthlyLimit : money(limit, c.monthlyLimit.currency),
      } : c) };
      message = action.mode === 'limit' ? 'Simulated card limit updated.' : 'Simulated card ' + (action.mode === 'freeze' ? 'frozen.' : 'unfrozen.');
      break;
    }
    case 'subscription': {
      const subscription = snapshot.subscriptions.find(s => s.id === action.subscriptionId && s.ownerId === snapshot.users[0].id);
      if (!subscription || subscription.status !== 'active') throw new Error('Subscription is not active');
      next = { ...snapshot, subscriptions: snapshot.subscriptions.map(s => s.id === subscription.id ? { ...s, status: 'cancelled' as const } : s) };
      message = 'Simulated cancellation completed for ' + subscription.merchant + '. Historical charges retained.';
      break;
    }
    case 'investment': {
      const source = accountFor(snapshot, action.sourceId);
      const product = snapshot.investmentProducts.find(p => p.id === action.productId);
      if (!product || !product.fictional || source.currency !== 'CNY') throw new Error('Fictional CNY product not available');
      const amount = positive(action.amountMinor);
      const matching = snapshot.holdings.find(h => h.ownerId === source.ownerId && h.productId === product.id);
      if (action.direction === 'redeem' && (!matching || matching.simulatedValue.amountMinor < amount)) throw new Error('Insufficient simulated holdings');
      const accounts = action.direction === 'buy' ? withDebit(snapshot, source.id, amount) :
        snapshot.accounts.map(a => a.id === source.id ? { ...a, balance: money(a.balance.amountMinor + amount, a.currency),
          availableBalance: money(a.availableBalance.amountMinor + amount, a.currency) } : a);
      const delta = action.direction === 'buy' ? amount : -amount;
      const existingHoldings = snapshot.holdings.map(h => h.id === matching?.id ? {
        ...h, costBasis: money(h.costBasis.amountMinor + delta, 'CNY'),
        simulatedValue: money(h.simulatedValue.amountMinor + delta, 'CNY'),
        units: (Number(h.units) + Number(delta) / 100).toFixed(6),
      } : h);
      const newHolding = !matching && action.direction === 'buy' ? [{
        id: id + '-holding', ownerId: source.ownerId, productId: product.id, units: (Number(amount) / 100).toFixed(6),
        costBasis: money(amount, 'CNY'), simulatedValue: money(amount, 'CNY') }] : [];
      next = { ...snapshot, accounts, holdings: [...existingHoldings, ...newHolding],
        investmentOrders: [...snapshot.investmentOrders, { id, ownerId: source.ownerId, productId: product.id,
          direction: action.direction, amount: money(amount, 'CNY'), status: 'completed', idempotencyKey: id,
          initiatedBy: source.ownerId, planId: null, actionId: null, createdAt: now, updatedAt: now, auditEventId: id }],
        transactions: [...snapshot.transactions, ledger(snapshot, id + '-txn', source,
          action.direction === 'buy' ? 'debit' : 'credit', amount, 'asset-movement', 'investment', product.name, null, id)] };
      message = 'Simulated ' + action.direction + ' completed for ' + product.name + '. No real securities were traded.';
      break;
    }
  }
  return { snapshot: appendAudit(snapshot, next, id, 'demo.' + action.type, message), message };
}

export function runApprovedDemoBatch(snapshot: FinancialSnapshot, steps: readonly DemoBatchStep[]): Readonly<{ snapshot: FinancialSnapshot; results: readonly DemoResult[] }> {
  let current = snapshot;
  const results: DemoResult[] = [];
  for (const step of steps) {
    if (!step.approved) {
      results.push({ id: step.id, action: step.action, status: 'rejected', message: 'Not approved; no change.' });
      continue;
    }
    try {
      const result = applyDemoAction(current, step.action, step.id);
      current = result.snapshot;
      results.push({ id: step.id, action: step.action, status: 'executed', message: result.message });
    } catch (error) {
      results.push({ id: step.id, action: step.action, status: 'failed', message: error instanceof Error ? error.message : 'Action failed' });
    }
  }
  return { snapshot: current, results };
}

