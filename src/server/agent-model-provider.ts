export type ModelErrorCode='MODEL_UNAVAILABLE'|'MODEL_RATE_LIMITED'|'MODEL_TIMEOUT'|'MODEL_CONFIGURATION'|'MODEL_BAD_RESPONSE';
export class AgentModelError extends Error{constructor(public readonly code:ModelErrorCode){super(code==='MODEL_UNAVAILABLE'?code:'MODEL_UNAVAILABLE: '+code);}}
export function modelFailureMessage(code:string,chinese=false){
 const messages:Record<string,[string,string]>={MODEL_RATE_LIMITED:['The free language provider has reached a rate or quota limit. Please try later; task forms still work.','免费语言服务达到了请求或配额限制，请稍后重试，也可以使用任务表单。'],MODEL_TIMEOUT:['The language service timed out. Your request is saved; try again or clarify it below.','语言服务响应超时。你的请求已保留，可以重试或继续补充说明。'],MODEL_CONFIGURATION:['The language service configuration needs attention. Task forms are still available.','语言服务配置需要检查，任务表单仍然可用。'],MODEL_BAD_RESPONSE:['I could not safely interpret that response. Your request is saved; please clarify or try again.','我无法可靠解析服务的回复。你的请求已保留，请补充说明或重试。'],MODEL_UNAVAILABLE:['The language service is temporarily unavailable. Your request is saved; task forms still work.','语言服务暂时不可用。你的请求已保留，任务表单仍然可用。']};return (messages[code]??messages.MODEL_UNAVAILABLE)[chinese?1:0]+(chinese?' 没有执行任何操作。':' No action was confirmed.');
}
type ModelConfiguration={provider:'openai'|'openrouter';key:string;model:string};
type IntentRequest={model:string;store:boolean;max_output_tokens:number;instructions:string;input:string;text:{format:{type:string;name:string;strict:boolean;schema:Record<string,unknown>}}};
/** No custom endpoint URLs: provider secrets are sent only to their fixed destination. */
export function agentModelConfiguration():ModelConfiguration {
 const provider=process.env.BANK_AGENT_PROVIDER??'openai';
 if(provider!=='openai'&&provider!=='openrouter')throw new AgentModelError('MODEL_CONFIGURATION');
 const key=(provider==='openrouter'?process.env.OPENROUTER_API_KEY:process.env.OPENAI_API_KEY)?.trim();
 const model=(provider==='openrouter'?process.env.OPENROUTER_AGENT_MODEL:process.env.OPENAI_AGENT_MODEL)?.trim();
 if(!key||!model||model.length>200||/[\r\n]/.test(key+model))throw new AgentModelError('MODEL_CONFIGURATION');
 return{provider,key,model};
}
export async function requestAgentIntent(config:ModelConfiguration,request:IntentRequest,options:{fictionalDemo?:boolean}={}):Promise<string>{
 const openrouter=config.provider==='openrouter';
 const allowDemoCollection=options.fictionalDemo===true&&(process.env.NODE_ENV!=='production'||process.env.FUFU_DEMO_SHARED_STORE==='true'&&process.env.COMPETITION_PUBLIC_DEMO==='1')&&process.env.OPENROUTER_DEMO_ALLOW_DATA_COLLECTION==='true'&&config.model.endsWith(':free');
 const payload=openrouter?{
  model:config.model,stream:false,max_tokens:request.max_output_tokens,
  ...(config.model.replace(/:free$/,'')==='nvidia/nemotron-3.5-super-vl'?{reasoning:{enabled:false}}:{}),
  messages:[{role:'system',content:request.instructions},{role:'user',content:request.input}],
  response_format:{type:'json_schema',json_schema:{name:request.text.format.name,strict:request.text.format.strict,schema:request.text.format.schema}},
  provider:{require_parameters:true,data_collection:allowDemoCollection?'allow':'deny'},
 }:request;
 let response:Response|undefined;
 for(let attempt=0;attempt<2;attempt++){
  try{
   response=await fetch(openrouter?'https://openrouter.ai/api/v1/chat/completions':'https://api.openai.com/v1/responses',{method:'POST',redirect:'error',signal:AbortSignal.timeout(attempt===0?12000:4000),headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
   if(response.ok)break;
   const code:ModelErrorCode=response.status===429?'MODEL_RATE_LIMITED':response.status===401||response.status===403?'MODEL_CONFIGURATION':'MODEL_UNAVAILABLE';
   console.warn('Fufu model request failed',{provider:config.provider,status:response.status,code,attempt:attempt+1});
   if(attempt===0&&response.status>=500){await new Promise(r=>setTimeout(r,200));continue;}
   throw new AgentModelError(code);
  }catch(e){
   if(e instanceof AgentModelError)throw e;
   const timeout=e instanceof Error&&['TimeoutError','AbortError'].includes(e.name);
   const code:ModelErrorCode=timeout?'MODEL_TIMEOUT':'MODEL_UNAVAILABLE';
   console.warn('Fufu model transport failed',{provider:config.provider,code,attempt:attempt+1});
   if(attempt===0)continue;throw new AgentModelError(code);
  }
 }
 if(!response?.ok)throw new AgentModelError('MODEL_UNAVAILABLE');
 if(openrouter){
  const body=await response.json() as {error?:unknown;choices?:{finish_reason?:string;message?:{role?:string;content?:unknown;refusal?:unknown;tool_calls?:unknown[]}}[]};
  const choice=body.choices?.[0],message=choice?.message;
  if(body.error||choice?.finish_reason!=='stop'||!message||message.refusal||message.tool_calls?.length||typeof message.content!=='string')throw new AgentModelError('MODEL_CONFIGURATION');
  return message.content;
 }
 const body=await response.json() as {status?:string;output?:{type:string;content?:{type:string;text?:string}[]}[]};
 if(body.status!=='completed')throw new AgentModelError('MODEL_BAD_RESPONSE');
 const text=body.output?.filter(o=>o.type==='message').flatMap(o=>o.content??[]).find(c=>c.type==='output_text')?.text;
 if(typeof text!=='string')throw new AgentModelError('MODEL_BAD_RESPONSE');return text;
}
