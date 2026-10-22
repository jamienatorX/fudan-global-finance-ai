import {createHash,randomBytes} from 'node:crypto';
import {newConversation,type ConversationState} from '../agent/conversation-contracts';
import {supabaseConfig} from '../lib/supabase/config';
export function hostedDemoEnabled(){return process.env.FUFU_DEMO_SHARED_STORE==='true'&&process.env.COMPETITION_PUBLIC_DEMO==='1'&&Boolean(process.env.FUFU_DEMO_SERVER_SECRET);}
/** The server secret grants access only to fictional chat rows, never banking records. */
export class HostedDemoConversationStore{
 private async rpc(operation:string,token:string,state:ConversationState|null=null,revision:number|null=null,create=false):Promise<ConversationState>{
  if(!hostedDemoEnabled())throw new Error('LOCAL_DEMO_ONLY');const {url,key}=supabaseConfig();
  const response=await fetch(url+'/rest/v1/rpc/fufu_demo_conversation',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_secret:process.env.FUFU_DEMO_SERVER_SECRET,p_operation:operation,p_token_hash:createHash('sha256').update(token).digest('hex'),p_state:state,p_revision:revision,p_create:create})});
  const result=await response.json();if(!response.ok){const code=['CONVERSATION_EXPIRED','STALE_CONVERSATION','RATE_LIMITED','INVALID_SESSION'].find(c=>String(result.message??'').includes(c));throw new Error(code??'CONVERSATION_UNAVAILABLE');}return result as ConversationState;
 }
 async open(token?:string){if(token&&!/^[a-f0-9]{64}$/.test(token))throw new Error('INVALID_SESSION');const next=token??randomBytes(32).toString('hex');return{token:next,state:await this.rpc('open',next,token?null:newConversation('demo'),null,!token)};}
 async reserve(token:string){await this.rpc('reserve',token);}
 async save(token:string,state:ConversationState,revision:number){await this.rpc('save',token,state,revision);}
}
