import {expect,it} from 'vitest';
import {resolveAgentQuote} from '../../src/agent/fx-tool';
import {demoAgentContext} from '../../src/agent/context-adapters';
import {createSeedSnapshot} from '../../src/demo/seed';
it('uses labelled reference fixtures and never proposes a currency mutation',()=>{const c=demoAgentContext(createSeedSnapshot('v1'),0);const p=resolveAgentQuote('Convert USD 100 to CNY',c);expect(p?.message).toContain('Reference only');expect(p?.actions).toEqual([]);expect(p?.message).toContain('fallback');expect(resolveAgentQuote('Convert USD 1 to USD',c)?.message).toContain('identity');expect(resolveAgentQuote('Convert USD 1 to XYZ',c)?.resultKind).toBe('unsupported');});
import {planQuote} from '../../src/agent/fx-tool';
it('connects additional website currencies to live reference quotes and labels failures honestly',async()=>{const c=demoAgentContext(createSeedSnapshot('v1'),0);const live=await planQuote('Convert JPY 100 to CNY',c,async()=>({base:'JPY',quote:'CNY',rate:0.05,date:'2026-10-22',source:'live-reference',provider:'Test provider'}));expect(live?.message).toContain('CNY 5.00');expect(live?.message).toContain('Test provider');expect(live?.actions).toEqual([]);const fallback=await planQuote('Convert USD 100 to CNY',c,async()=>{throw new Error('offline');});expect(fallback?.message).toContain('fallback');});
