import {describeConversation} from '../../../../src/agent/conversation-controller';
import type {NextRequest} from 'next/server';
import {HostedDemoConversationStore,hostedDemoEnabled} from '../../../../src/server/hosted-demo-conversation-store';
import {localDemoStore} from '../../../../src/server/demo-conversation-store';
import {validateDemoContext} from '../../../../src/server/demo-agent-context';
import {applyConversationOperation} from '../../../../src/server/agent-conversation-operations';
import {conversationBody,conversationError,conversationReply} from '../../../../src/server/conversation-http';
export const runtime='nodejs';
export async function POST(request:NextRequest){try{
 const hosted=hostedDemoEnabled();if(hosted){if(request.cookies.get('bank-demo')?.value!=='1')throw new Error('AUTH_REQUIRED');}else if(process.env.NODE_ENV==='production'||!['127.0.0.1','localhost','[::1]'].includes(request.nextUrl.hostname))throw new Error('LOCAL_DEMO_ONLY');
 const b=await conversationBody(request);if(b.operation==='prepare'||b.operation==='execute'||b.approve!==undefined)throw new Error('INVALID_OPERATION');
 const c=validateDemoContext(b.context),store=hosted?new HostedDemoConversationStore():localDemoStore();let token=request.cookies.get('fufu-demo-session')?.value;
 let session;try{session=await store.open(token);}catch(e){if(b.operation!=='reset')throw e;session=await store.open();b.revision=session.state.revision;}
 if(b.operation==='reset'&&(!token||b.conversationId!==session.state.id))b.revision=session.state.revision;
 token=session.token;if(b.operation!=='reset'&&b.conversationId&&b.conversationId!==session.state.id)throw new Error('CONVERSATION_NOT_FOUND');
 if(b.operation==='review'){if(b.revision!==session.state.revision)throw new Error('STALE_CONVERSATION');const task=describeConversation(session.state,c).tasks.find(t=>t.draft.id===b.taskId);if(task?.status!=='ready'||task.plan?.actions.length!==1)throw new Error('INVALID_DRAFT');return conversationReply({task});}
 if(b.operation==='message')await store.reserve(token);
 const turn=await applyConversationOperation(session.state,c,b);if(turn.state.revision!==session.state.revision)await store.save(token,turn.state,session.state.revision);
 const result=conversationReply(turn);result.cookies.set('fufu-demo-session',token,{httpOnly:true,sameSite:'strict',path:'/api/agent/demo-conversation',maxAge:1800,secure:process.env.NODE_ENV==='production'});return result;
 }catch(e){return conversationError(e);}}
