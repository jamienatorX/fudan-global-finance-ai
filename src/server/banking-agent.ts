import {planScenario} from '../agent/scenario-tools';
import {planQuote} from '../agent/fx-tool';
import {fetchReferenceQuote} from '../features/fx/reference-quote';
import {validSupportDestination} from '../agent/support';
import {readBankingState,type SimClient} from './secure-banking';
import {readAgentHistory} from './agent-history';
import {privateAgentContext} from '../agent/context-adapters';
import {planCommand} from '../agent/planner';
import {interpretWithModel} from './agent-model';

export async function createBankingPlan(client:SimClient,command:string) {
 const state=await readBankingState(client);if(!state.enrolled)throw new Error('ENROLLMENT_REQUIRED');
 const history=await readAgentHistory(client);
 const context=privateAgentContext(state,history.transactions,history.coverage);
 const interpreted=planScenario(command,context)?null:await interpretWithModel(command,context);
 const plan=planCommand(interpreted??command,context);
 const quote=await planQuote(interpreted??command,context,async(base,quote)=>(await fetchReferenceQuote(base,quote)).data);if(quote)Object.assign(plan,quote);
 if(interpreted!==null)plan.mode='live-model';
 plan.supportDestination=validSupportDestination(process.env.FU_BANK_SUPPORT_URL);
 const tabs:Record<string,string>={'/overview':'overview','/accounts':'overview','/transfers':'transfers','/transactions':'activity','/wealth':'wealth','/cards':'cards','/subscriptions':'subscriptions','/planner':'budgets','/audit':'activity','/copilot':'overview'};
 plan.links=plan.links?.map(link=>({...link,href:tabs[link.href]?'/banking?tab='+tabs[link.href]:link.href==='/settings'?'/security':link.href}));
 const saved=await client.rpc('bank_agent_store_plan',{p_plan:plan});
 if(saved.error)throw new Error(saved.error.message.includes('STALE_STATE')?'STALE_STATE':'PLAN_UNAVAILABLE');
 return plan;
}
