// @vitest-environment node
import {it,expect,vi,afterEach} from 'vitest';
import {requestAgentIntent} from '../../src/server/agent-model-provider';
const config={provider:'openrouter' as const,key:'test-secret',model:'test/model:free'};
const request={model:config.model,store:false,max_output_tokens:10,instructions:'test',input:'fictional',text:{format:{type:'json_schema',name:'test',strict:true,schema:{type:'object'}}}};
afterEach(()=>vi.unstubAllGlobals());
it('retries a transient upstream error once without changing the model',async()=>{const f=vi.fn().mockResolvedValueOnce({ok:false,status:503}).mockResolvedValueOnce({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'{}'}}]})});vi.stubGlobal('fetch',f);expect(await requestAgentIntent(config,request)).toBe('{}');expect(f).toHaveBeenCalledTimes(2);expect(f.mock.calls.map(c=>JSON.parse(c[1].body).model)).toEqual([config.model,config.model]);});
it('distinguishes a provider quota response and does not retry it',async()=>{const f=vi.fn().mockResolvedValue({ok:false,status:429});vi.stubGlobal('fetch',f);await expect(requestAgentIntent(config,request)).rejects.toThrow('MODEL_RATE_LIMITED');expect(f).toHaveBeenCalledTimes(1);});
it('distinguishes invalid credentials without exposing the key',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:401}));await expect(requestAgentIntent(config,request)).rejects.toThrow('MODEL_CONFIGURATION');});
