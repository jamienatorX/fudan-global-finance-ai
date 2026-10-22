import {createSeedSnapshot,normalizeDemoSnapshot} from '../demo/seed';
import {demoAgentContext} from '../agent/context-adapters';
import type {AgentContext,AgentTransaction} from '../agent/contracts';
const record=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('INVALID_CONTEXT');return v as Record<string,unknown>;};
const minor=(v:unknown)=>{if(typeof v!=='string'||!/^\d{1,14}$/.test(v))throw new Error('INVALID_CONTEXT');return v;};
const text=(v:unknown)=>{if(typeof v!=='string'||v.length>500)throw new Error('INVALID_CONTEXT');return v;};
/** Browser-supplied balances are fictional only; IDs/names/capabilities come from our fixed seed. */
export function validateDemoContext(value:unknown):AgentContext{
 const v=record(value);if(typeof v.source!=='string'||!v.source.startsWith('browser-local')||!Number.isSafeInteger(v.version)||Number(v.version)<0)throw new Error('INVALID_CONTEXT');
 const c=demoAgentContext(normalizeDemoSnapshot(createSeedSnapshot('v1')),Number(v.version));
 const rows=(key:string)=>{const a=v[key]??[];if(!Array.isArray(a)||a.length>2000)throw new Error('INVALID_CONTEXT');return a.map(record);};
 for(const row of rows('accounts')){const a=c.accounts!.find(a=>a.id===row.id);if(!a)throw new Error('INVALID_CONTEXT');a.balanceMinor=minor(row.balanceMinor);a.availableMinor=minor(row.availableMinor);}
 for(const row of rows('cards')){const a=c.cards.find(a=>a.id===row.id);if(!a||typeof row.frozen!=='boolean')throw new Error('INVALID_CONTEXT');a.frozen=row.frozen;a.limitMinor=minor(row.limitMinor);}
 for(const row of rows('subscriptions')){const a=c.subscriptions.find(a=>a.id===row.id);if(!a||typeof row.active!=='boolean')throw new Error('INVALID_CONTEXT');a.active=row.active;}
 for(const row of rows('tuition')){const a=c.tuition!.find(a=>a.id===row.id);if(!a||typeof row.paid!=='boolean')throw new Error('INVALID_CONTEXT');a.paid=row.paid;a.outstandingMinor=minor(row.outstandingMinor);}
 for(const row of rows('budgets')){const b=c.budgets!.find(b=>b.category===row.category&&b.currency===row.currency);if(!b)throw new Error('INVALID_CONTEXT');b.limitMinor=minor(row.limitMinor);b.spentMinor=minor(row.spentMinor);}
 c.holdings=rows('holdings').map(h=>{if(!c.products!.some(p=>p.id===h.productId))throw new Error('INVALID_CONTEXT');return{productId:text(h.productId),valueMinor:minor(h.valueMinor)};});
 c.transactions=rows('transactions').map(t=>{if(!c.accounts!.some(a=>a.id===t.accountId&&a.currency===t.currency)||!['debit','credit'].includes(String(t.direction))||!['consumption','income','internal-transfer','external-transfer','asset-movement'].includes(String(t.classification))||typeof t.settled!=='boolean'||!Number.isFinite(Date.parse(String(t.date))))throw new Error('INVALID_CONTEXT');return{id:text(t.id),accountId:text(t.accountId),currency:text(t.currency),amountMinor:minor(t.amountMinor),merchant:text(t.merchant),date:text(t.date),category:text(t.category),direction:text(t.direction),classification:text(t.classification),settled:t.settled} as AgentTransaction;});
 c.ledger=c.transactions;c.ledgerCoverage='All submitted fictional demo records (maximum 2,000); not real bank ingestion';
 const coverage=record(v.coverage);if(typeof coverage.truncated!=='boolean'||!Number.isFinite(Date.parse(String(coverage.from)))||!Number.isFinite(Date.parse(String(coverage.to))))throw new Error('INVALID_CONTEXT');c.coverage={from:text(coverage.from),to:text(coverage.to),truncated:coverage.truncated};
 // No client-controlled recipients, owner/source switch, product risk, exchange rate or execution receipt is trusted.
 return c;
}
