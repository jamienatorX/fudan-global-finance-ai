import type { CurrencyCode } from './currency';
import type { Money } from './money';

export type EntityId = string;
export type ISODate = string;
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type Cadence = 'monthly' | 'yearly';
export type ExpenseCategory = 'rent' | 'food' | 'transportation' | 'shopping' | 'other';

export type User = Readonly<{
  id: EntityId;
  profile: Readonly<{ displayName: string; nationality: string; institution: string; city: string }>;
  homeCurrency: CurrencyCode;
  locale: string;
  riskProfileRef: string;
}>;
export type Account = Readonly<{
  id: EntityId; ownerId: EntityId; type: 'daily' | 'savings'; currency: CurrencyCode;
  balance: Money; availableBalance: Money; status: 'active' | 'closed'; goal: Money | null;
}>;
export type ExchangeRate = Readonly<{
  id: EntityId; base: CurrencyCode; quote: CurrencyCode; rate: string; provider: string;
  referenceAt: ISODate; retrievedAt: ISODate; source: 'live' | 'fallback';
}>;
export type Beneficiary = Readonly<{
  id: EntityId; ownerId: EntityId; displayName: string; phone: string; accountAlias: string;
  supportedCurrencies: readonly CurrencyCode[]; verificationState: 'verified' | 'unverified';
}>;
export type Recurrence = Readonly<{ cadence: Cadence; nextOccurrenceAt: ISODate }>;
export type Transaction = Readonly<{
  id: EntityId; ownerId: EntityId; accountId: EntityId; direction: 'credit' | 'debit';
  amount: Money; originalCurrency: CurrencyCode; category: ExpenseCategory | 'family-allowance' | 'scholarship' | 'transfer' | 'investment';
  classification: 'income' | 'consumption' | 'internal-transfer' | 'asset-movement' | 'external-transfer';
  merchant: string; occurredAt: ISODate; recordedAt: ISODate; transferId: EntityId | null;
  investmentOrderId: EntityId | null; subscriptionId: EntityId | null; recurrence: Recurrence | null;
  anomaly: string | null;
}>;
export type MutationMetadata = Readonly<{
  idempotencyKey: string; initiatedBy: EntityId; planId: EntityId | null; actionId: EntityId | null;
  createdAt: ISODate; updatedAt: ISODate; auditEventId: EntityId;
}>;
export type Transfer = Readonly<{
  id: EntityId; ownerId: EntityId; sourceAccountId: EntityId; destinationAccountId: EntityId | null;
  beneficiaryId: EntityId | null; tuitionObligationId: EntityId | null; amount: Money; currency: CurrencyCode;
  scheduledAt: ISODate | null; status: 'scheduled' | 'completed' | 'failed'; receiptRef: string | null;
}> & MutationMetadata;
export type Budget = Readonly<{
  id: EntityId; ownerId: EntityId; month: string; category: ExpenseCategory; limit: Money;
  actualSpend: Money; currency: CurrencyCode; status: 'within-limit' | 'over-limit';
}>;
export type Card = Readonly<{
  id: EntityId; ownerId: EntityId; accountId: EntityId; maskedNumber: string; cardType: 'virtual';
  purpose: 'daily' | 'online-shopping'; freezeState: 'active' | 'frozen'; dailyLimit: Money; monthlyLimit: Money;
}>;
export type CardRestriction = Readonly<{
  id: EntityId; cardId: EntityId; merchantCategory: string; state: 'allow' | 'deny';
}>;
export type Subscription = Readonly<{
  id: EntityId; ownerId: EntityId; merchant: string; amount: Money; currency: CurrencyCode;
  cadence: Cadence; nextRenewalAt: ISODate; lastUsageAt: ISODate | null; status: 'active' | 'cancelled';
}>;
export type InvestmentProduct = Readonly<{
  id: EntityId; name: string; fictional: true; category: 'money-market' | 'bond' | 'balanced' | 'equity-index';
  simulatedRisk: 'low' | 'medium' | 'high'; feeBasisPoints: number; liquidity: 'daily' | 't-plus-2';
  historicalSimulation: Readonly<{ period: string; returnBasisPoints: number; drawdownBasisPoints: number }>;
  disclaimer: string;
}>;
export type Holding = Readonly<{
  id: EntityId; ownerId: EntityId; productId: EntityId; units: string; costBasis: Money; simulatedValue: Money;
}>;
export type InvestmentOrder = Readonly<{
  id: EntityId; ownerId: EntityId; productId: EntityId; direction: 'buy' | 'redeem';
  amount: Money; status: 'pending' | 'completed' | 'failed';
}> & MutationMetadata;
export type TuitionObligation = Readonly<{
  id: EntityId; ownerId: EntityId; institution: string; installment: string; amount: Money;
  dueAt: ISODate; paidAmount: Money; status: 'unpaid' | 'partially-paid' | 'paid';
}>;
export type AIConversation = Readonly<{ id: EntityId; ownerId: EntityId; title: string; createdAt: ISODate; updatedAt: ISODate }>;
export type AIMessage = Readonly<{
  id: EntityId; conversationId: EntityId; role: 'user' | 'assistant' | 'tool'; content: string;
  metadata: JsonValue; createdAt: ISODate;
}>;
export type AgentPlan = Readonly<{
  id: EntityId; ownerId: EntityId; normalizedIntent: string; contextSnapshot: JsonValue; calculations: JsonValue;
  status: 'draft' | 'awaiting-approval' | 'approved' | 'executed' | 'failed' | 'cancelled';
  version: number; createdAt: ISODate; updatedAt: ISODate;
}>;
export type AgentAction = Readonly<{
  id: EntityId; planId: EntityId; order: number; tool: string; input: JsonValue; expectedImpact: JsonValue;
  validationResult: JsonValue; executionResult: JsonValue;
}>;
export type ApprovalRecord = Readonly<{
  id: EntityId; actionId: EntityId; userId: EntityId; decision: 'approved' | 'rejected';
  approvedPayloadHash: string; decidedAt: ISODate; expiresAt: ISODate;
}>;
export type AuditEvent = Readonly<{
  id: EntityId; ownerId: EntityId; eventType: string; actorId: EntityId; targetId: EntityId;
  beforeSummary: JsonValue; afterSummary: JsonValue; outcome: 'success' | 'failure';
  correlationId: string; occurredAt: ISODate;
}>;

/** Domain snapshot; use FinancialSnapshotDTO before crossing a JSON boundary. */
export type FinancialSnapshot = Readonly<{
  seedVersion: string; asOf: ISODate; users: readonly User[]; accounts: readonly Account[];
  exchangeRates: readonly ExchangeRate[]; beneficiaries: readonly Beneficiary[]; transactions: readonly Transaction[];
  transfers: readonly Transfer[]; budgets: readonly Budget[]; cards: readonly Card[]; cardRestrictions: readonly CardRestriction[];
  subscriptions: readonly Subscription[]; investmentProducts: readonly InvestmentProduct[]; holdings: readonly Holding[];
  investmentOrders: readonly InvestmentOrder[]; tuitionObligations: readonly TuitionObligation[];
  aiConversations: readonly AIConversation[]; aiMessages: readonly AIMessage[]; agentPlans: readonly AgentPlan[];
  agentActions: readonly AgentAction[]; approvalRecords: readonly ApprovalRecord[]; auditEvents: readonly AuditEvent[];
}>;
