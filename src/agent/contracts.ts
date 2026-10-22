export type AgentTransaction = {id:string;accountId:string;currency:string;amountMinor:string;merchant:string;date:string;category:string;direction:string;classification:string;settled:boolean};
export type AgentSubscription = {id:string;name:string;active:boolean;amountMinor:string;currency:string;cadence:'monthly'|'yearly';capability:'simulated'|'merchant-managed'|'unknown';usage:string;nextRenewal?:string};
export type AgentCard = {id:string;name:string;frozen:boolean;limitMinor:string};
export type AgentAccount = {id:string;name:string;currency:string;balanceMinor:string;availableMinor:string;goalMinor?:string};
export type AgentProduct = {id:string;name:string;risk:string;fees:string;liquidity:string};
export type AgentContext = {source:string;asOf:string;version:number;coverage:{from:string;to:string;truncated:boolean};transactions:AgentTransaction[];subscriptions:AgentSubscription[];cards:AgentCard[];
 accounts?:AgentAccount[];recipients?:{id:string;name:string;currencies:readonly string[];verified:boolean}[];
 budgets?:{category:string;limitMinor:string;currency:string;spentMinor?:string}[];
 tuition?:{id:string;name:string;outstandingMinor:string;currency:string;paid:boolean}[];
 products?:AgentProduct[];holdings?:{productId:string;valueMinor:string}[];
 activity?:{id:string;label:string;date:string}[];activityCoverage?:string;
 ledger?:AgentTransaction[];ledgerCoverage?:string;
 receipts?:{id:string;type:string;sourceId?:string;destinationId?:string;beneficiaryId?:string;scheduledAt?:string;tuitionId?:string;amountMinor:string;status:string}[];
 rates?:import('../domain/entities').ExchangeRate[];
};
export type Proposal = {type:'subscription'|'card'|'transfer'|'tuition'|'budget'|'investment';[key:string]:string};
export type ProposedAction = {id:string;description:string;payload:Proposal};
export type RecurringCandidate = {merchant:string;accountId:string;currency:string;cadence:'weekly'|'monthly'|'yearly';confidence:'high'|'possible';reasons:string[];evidence:AgentTransaction[];nextWindow:{from:string;to:string};amountMinor:string};
export type AgentPlanResult = {id:string;mode:'deterministic'|'live-model';source:string;asOf:string;version:number;expiresAt:number;coverage:AgentContext['coverage'];message:string;actions:ProposedAction[];choices:string[];recurring:RecurringCandidate[];subscriptions:AgentSubscription[];resultKind?:'answer'|'proposal'|'needs-input'|'unsupported'|'handoff';links?:{href:string;label:string}[];supportDestination?:string};
export function displayAmount(minor:string,currency:string):string {
 const value=BigInt(minor),n=value<0n?-value:value,scale=currency==='IDR'?1n:100n;
 return `${currency} ${value<0n?'-':''}${n/scale}${scale===1n?'':'.'+(n%scale).toString().padStart(2,'0')}`;
}
export const normalizeMerchant=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
