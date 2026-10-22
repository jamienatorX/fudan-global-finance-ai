type ModelConfiguration={provider:'openai'|'openrouter';key:string;model:string};
type IntentRequest={model:string;store:boolean;max_output_tokens:number;instructions:string;input:string;text:{format:{type:string;name:string;strict:boolean;schema:Record<string,unknown>}}};
/** No custom endpoint URLs: provider secrets are sent only to their fixed destination. */
export function agentModelConfiguration():ModelConfiguration {
 const provider=process.env.BANK_AGENT_PROVIDER??'openai';
 if(provider!=='openai'&&provider!=='openrouter')throw new Error('MODEL_UNAVAILABLE');
 const key=(provider==='openrouter'?process.env.OPENROUTER_API_KEY:process.env.OPENAI_API_KEY)?.trim();
 const model=(provider==='openrouter'?process.env.OPENROUTER_AGENT_MODEL:process.env.OPENAI_AGENT_MODEL)?.trim();
 if(!key||!model||model.length>200||/[\r\n]/.test(key+model))throw new Error('MODEL_UNAVAILABLE');
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
 const response=await fetch(openrouter?'https://openrouter.ai/api/v1/chat/completions':'https://api.openai.com/v1/responses',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
  headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},body:JSON.stringify(payload),
 });
 if(!response.ok)throw new Error('MODEL_UNAVAILABLE');
 if(openrouter){
  const body=await response.json() as {error?:unknown;choices?:{finish_reason?:string;message?:{role?:string;content?:unknown;refusal?:unknown;tool_calls?:unknown[]}}[]};
  const choice=body.choices?.[0],message=choice?.message;
  if(body.error||choice?.finish_reason!=='stop'||!message||message.refusal||message.tool_calls?.length||typeof message.content!=='string')throw new Error('MODEL_UNAVAILABLE');
  return message.content;
 }
 const body=await response.json() as {status?:string;output?:{type:string;content?:{type:string;text?:string}[]}[]};
 if(body.status!=='completed')throw new Error('MODEL_UNAVAILABLE');
 const text=body.output?.filter(o=>o.type==='message').flatMap(o=>o.content??[]).find(c=>c.type==='output_text')?.text;
 if(typeof text!=='string')throw new Error('MODEL_UNAVAILABLE');return text;
}
