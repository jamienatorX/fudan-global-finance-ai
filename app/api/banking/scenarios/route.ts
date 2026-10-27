import type {NextRequest} from 'next/server';
import {competitionEndpoint,checkedRpc,id} from '../../../../src/server/competition-http';
import {readScenarioState} from '../../../../src/server/scenario-state';
import {readBankingState} from '../../../../src/server/secure-banking';
import {readAgentHistory} from '../../../../src/server/agent-history';
import {privateAgentContext} from '../../../../src/agent/context-adapters';
import {buildAgentReport} from '../../../../src/agent/period-report';
export const runtime='nodejs';
export async function POST(request:NextRequest){return competitionEndpoint(request,['operation','jobId','command','actionId','period'],async(client,b)=>{
 switch(b.operation){
  case 'state':return readScenarioState(client);
  case 'initialize':return checkedRpc(client,'bank_scenario_initialize');
  case 'job':if(typeof b.command!=='string'||!['pause','resume','cancel','review'].includes(b.command))throw new Error('INVALID_REQUEST');return checkedRpc(client,'bank_job_command',{p_id:id(b.jobId),p_command:b.command});
  case 'evidence':return checkedRpc(client,'bank_action_evidence',{p_id:id(b.actionId)});
  case 'report':{
   if(typeof b.period!=='string')throw new Error('INVALID_REQUEST');
   const [state,history]=await Promise.all([readBankingState(client),readAgentHistory(client)]);
   return buildAgentReport(privateAgentContext(state,history.transactions,history.coverage),b.period);
  }
  default:throw new Error('INVALID_REQUEST');
 }
});}
