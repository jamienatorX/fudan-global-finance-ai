import type { FinancialSnapshot } from '../../domain/entities';
import { fromFinancialSnapshotDTO, toFinancialSnapshotDTO, type FinancialSnapshotDTO } from '../../domain/financial-snapshot-dto';

// Explicit entity fields; nested JSON is never recursively interpreted as money.
const definitions = {
  "users": "id:uuid profile:jsonb homeCurrency:currency locale:text riskProfileRef:text",
  "accounts": "id:uuid ownerId:owner type:daily|savings currency:currency balance:money availableBalance:money status:active|closed goal:money?",
  "exchangeRates": "id:uuid base:currency quote:currency rate:decimal provider:text referenceAt:time retrievedAt:time source:live|fallback",
  "beneficiaries": "id:uuid ownerId:owner displayName:text phone:text accountAlias:text supportedCurrencies:currencies verificationState:verified|unverified",
  "transactions": "id:uuid ownerId:owner accountId:uuid direction:credit|debit amount:money originalCurrency:currency category:rent|food|transportation|shopping|other|family-allowance|scholarship|transfer|investment classification:income|consumption|internal-transfer|asset-movement|external-transfer merchant:text occurredAt:time recordedAt:time transferId:uuid? investmentOrderId:uuid? subscriptionId:uuid? recurrence:jsonb? anomaly:text?",
  "transfers": "id:uuid ownerId:owner sourceAccountId:uuid destinationAccountId:uuid? beneficiaryId:uuid? tuitionObligationId:uuid? amount:money currency:currency scheduledAt:time? status:scheduled|completed|failed receiptRef:text? idempotencyKey:text initiatedBy:uuid planId:uuid? actionId:uuid? createdAt:time updatedAt:time auditEventId:uuid",
  "budgets": "id:uuid ownerId:owner month:month category:rent|food|transportation|shopping|other limit:money actualSpend:money currency:currency status:within-limit|over-limit",
  "cards": "id:uuid ownerId:owner accountId:uuid maskedNumber:text cardType:virtual purpose:daily|online-shopping freezeState:active|frozen dailyLimit:money monthlyLimit:money",
  "cardRestrictions": "id:uuid cardId:uuid merchantCategory:text state:allow|deny",
  "subscriptions": "id:uuid ownerId:owner merchant:text amount:money currency:currency cadence:monthly|yearly nextRenewalAt:time lastUsageAt:time? status:active|cancelled",
  "investmentProducts": "id:uuid name:text fictional:true category:money-market|bond|balanced|equity-index simulatedRisk:low|medium|high feeBasisPoints:integer liquidity:daily|t-plus-2 historicalSimulation:jsonb disclaimer:text",
  "holdings": "id:uuid ownerId:owner productId:uuid units:decimal costBasis:money simulatedValue:money",
  "investmentOrders": "id:uuid ownerId:owner productId:uuid direction:buy|redeem amount:money status:pending|completed|failed idempotencyKey:text initiatedBy:uuid planId:uuid? actionId:uuid? createdAt:time updatedAt:time auditEventId:uuid",
  "tuitionObligations": "id:uuid ownerId:owner institution:text installment:text amount:money dueAt:time paidAmount:money status:unpaid|partially-paid|paid",
  "aiConversations": "id:uuid ownerId:owner title:text createdAt:time updatedAt:time",
  "aiMessages": "id:uuid conversationId:uuid role:user|assistant|tool content:text metadata:jsonb createdAt:time",
  "agentPlans": "id:uuid ownerId:owner normalizedIntent:text contextSnapshot:jsonb calculations:jsonb status:draft|awaiting-approval|approved|executed|failed|cancelled version:integer createdAt:time updatedAt:time",
  "agentActions": "id:uuid planId:uuid order:integer tool:text input:jsonb expectedImpact:jsonb validationResult:jsonb executionResult:jsonb",
  "approvalRecords": "id:uuid actionId:uuid userId:owner decision:approved|rejected approvedPayloadHash:text decidedAt:time expiresAt:time",
  "auditEvents": "id:uuid ownerId:owner eventType:text actorId:uuid targetId:uuid beforeSummary:jsonb afterSummary:jsonb outcome:success|failure correlationId:text occurredAt:time"
} as const;

const snake = (key: string) => key.replace(/[A-Z]/g, (letter) => '_' + letter.toLowerCase());
type Row = Record<string, unknown>;
function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid database record');
  return value as Row;
}

const currencies = new Set(['CNY', 'IDR', 'USD', 'SGD']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const decimal = /^\d+(?:\.\d+)?$/;
const positiveDecimal = (value: string) => decimal.test(value) && /[1-9]/.test(value);

// All ISODate fields in this persistence contract are full ISO timestamps, not
// locale-dependent dates. Validate the calendar explicitly: Date.parse rolls Feb 30.
function timestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && Number.isFinite(Date.parse(value));
}

function json(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(json);
  return typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype && Object.values(value).every(json);
}

function scalar(value: unknown, type: string): boolean {
  if (type === 'jsonb') return json(value);
  if (type === 'integer') return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 2147483647;
  if (type === 'true') return value === true;
  if (type === 'currencies') return Array.isArray(value) && value.every((item) => typeof item === 'string' && currencies.has(item));
  if (typeof value !== 'string') return false;
  if (type === 'text') return true;
  if (type === 'uuid') return uuid.test(value);
  if (type === 'time') return timestamp(value);
  if (type === 'month') return /^(?!0000)\d{4}-(?:0[1-9]|1[0-2])$/.test(value);
  if (type === 'decimal') return decimal.test(value);
  if (type === 'currency') return currencies.has(value);
  // Single-member literals (virtual) and unions are both closed allowlists.
  return type.split('|').includes(value);
}

export function snapshotToRows(snapshot: FinancialSnapshot, userId: string): Row {
  const dto = toFinancialSnapshotDTO(snapshot);
  const result: Row = { seedVersion: dto.seedVersion, asOf: dto.asOf };
  for (const [collection, definition] of Object.entries(definitions)) {
    result[collection] = (dto[collection as keyof typeof definitions] as readonly unknown[]).map((entity) => {
      const record = object(entity);
      const row: Row = { user_id: userId };
      for (const field of definition.split(' ')) {
        const [key, type] = field.split(':');
        const column = snake(key);
        if (type === 'owner') continue;
        const value = record[key];
        if (type.replace('?', '') === 'money') {
          const money = value === null ? null : object(value);
          row[column + '_amount_minor'] = money?.amountMinor ?? null;
          row[column + '_currency'] = money?.currency ?? null;
        } else row[column] = ['initiatedBy', 'actorId'].includes(key) || (collection === 'users' && key === 'id') ? userId : value;
      }
      return row;
    });
  }
  return result;
}

export function snapshotFromRows(input: unknown, userId: string): FinancialSnapshot {
  const rows = object(input);
  if (!uuid.test(userId) || typeof rows.seedVersion !== 'string' || !timestamp(rows.asOf)) throw new Error('Invalid snapshot metadata');
  const dto: Row = { seedVersion: rows.seedVersion, asOf: rows.asOf };
  for (const [collection, definition] of Object.entries(definitions)) {
    if (!Array.isArray(rows[collection])) throw new Error('Invalid database collection');
    dto[collection] = (rows[collection] as unknown[]).map((inputRow) => {
      const row = object(inputRow);
      if (row.user_id !== userId) throw new Error('Not authorized: database owner mismatch');
      const record: Row = {};
      for (const field of definition.split(' ')) {
        const [key, type] = field.split(':');
        const column = snake(key);
        if (type === 'owner') { record[key] = userId; continue; }
        let value: unknown;
        if (type.replace('?', '') === 'money') {
          const amount = row[column + '_amount_minor'];
          const currency = row[column + '_currency'];
          if (type.endsWith('?') && amount === null && currency === null) value = null;
          else {
            // Reject numbers: the RPC must cast bigint to text before JSON encoding.
            if (typeof amount !== 'string') throw new Error('Invalid database money: decimal string required');
            if (!/^-?\d+$/.test(amount)) throw new Error('Invalid database money: integer required');
            const minor = BigInt(amount);
            if (minor < -9223372036854775808n || minor > 9223372036854775807n || (collection !== 'transactions' && minor < 0n)) throw new Error('Invalid database money: out of range');
            value = { amountMinor: amount, currency };
          }
        } else {
          value = row[column];
          if (value === null && type.endsWith('?')) { record[key] = null; continue; }
          const base = type.replace('?', '');
          if (!scalar(value, base)) throw new Error('Invalid database field: ' + key);
          if (collection === 'exchangeRates' && key === 'rate' && !positiveDecimal(String(value))) throw new Error('Invalid database FX rate');
          if (key === 'feeBasisPoints' && Number(value) > 10000) throw new Error('Invalid database fee');
          if (key === 'version' && Number(value) < 1) throw new Error('Invalid database version');
        }
        record[key] = value;
      }
      return record;
    });
  }
  const result = fromFinancialSnapshotDTO(dto as FinancialSnapshotDTO);
  if (result.users.length !== 1 || result.users[0].id !== userId) throw new Error('Invalid authorized profile');
  const profile = object(result.users[0].profile);
  if (['displayName', 'nationality', 'institution', 'city'].some((key) => typeof profile[key] !== 'string')) throw new Error('Invalid database profile');
  for (const product of result.investmentProducts) {
    const simulation = object(product.historicalSimulation);
    if (typeof simulation.period !== 'string' || !Number.isSafeInteger(simulation.returnBasisPoints) || Number(simulation.returnBasisPoints) < -10000 || !Number.isSafeInteger(simulation.drawdownBasisPoints) || Number(simulation.drawdownBasisPoints) < 0 || Number(simulation.drawdownBasisPoints) > 10000) throw new Error('Invalid database simulation');
  }
  for (const transaction of result.transactions) {
    if (transaction.recurrence !== null) {
      const recurrence = object(transaction.recurrence);
      if (!['monthly', 'yearly'].includes(String(recurrence.cadence)) || !timestamp(recurrence.nextOccurrenceAt)) throw new Error('Invalid database recurrence');
    }
  }
  for (const account of result.accounts) {
    if ([account.balance.currency, account.availableBalance.currency, account.goal?.currency ?? account.currency].some((currency) => currency !== account.currency) || account.availableBalance.amountMinor > account.balance.amountMinor) throw new Error('Invalid database account money');
  }
  for (const row of [...result.transfers, ...result.subscriptions]) {
    if (row.amount.currency !== row.currency) throw new Error('Invalid database amount currency');
  }
  for (const budget of result.budgets) {
    if (budget.limit.currency !== budget.currency || budget.actualSpend.currency !== budget.currency) throw new Error('Invalid database budget currency');
  }
  for (const card of result.cards) {
    const account = result.accounts.find((row) => row.id === card.accountId);
    if (card.dailyLimit.currency !== card.monthlyLimit.currency || (account && card.dailyLimit.currency !== account.currency)) throw new Error('Invalid database card currency');
  }
  for (const tuition of result.tuitionObligations) {
    if (tuition.paidAmount.currency !== tuition.amount.currency || tuition.paidAmount.amountMinor > tuition.amount.amountMinor) throw new Error('Invalid database tuition payment');
  }
  return result;
}
