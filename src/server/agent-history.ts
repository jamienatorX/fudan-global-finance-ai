import type {SimClient} from './secure-banking';
import {purchaseRow} from '../agent/context-adapters';
import type {AgentContext,AgentTransaction} from '../agent/contracts';

/** Ordered bounded pagination, independent of the dashboard's 100-row ledger preview. */
export async function readAgentHistory(client:SimClient,now=new Date()):Promise<{transactions:AgentTransaction[];coverage:AgentContext['coverage']}> {
 const from=new Date(now);from.setUTCFullYear(from.getUTCFullYear()-3);
 const transactions:AgentTransaction[]=[];let truncated=false;
 for(let offset=0;offset<=5000;offset+=500){
  const {data,error}=await client.from('sim_purchase_history').select('*').gte('occurred_at',from.toISOString()).lte('occurred_at',now.toISOString()).order('occurred_at').order('id').range(offset,offset+499);
  if(error)throw new Error('HISTORY_UNAVAILABLE');
  if(offset===5000){truncated=Boolean(data?.length);break;}
  transactions.push(...(data??[]).map(purchaseRow));if(!data||data.length<500)break;
 }
 return {transactions,coverage:{from:from.toISOString(),to:now.toISOString(),truncated}};
}
