// @vitest-environment node
import {it,expect} from 'vitest';
import {validateDemoContext} from '../../src/server/demo-agent-context';
import {demoAgentContext} from '../../src/agent/context-adapters';
import {createSeedSnapshot,normalizeDemoSnapshot} from '../../src/demo/seed';
it('accepts the normalized live dashboard memberships and subscription budget',()=>{const c=demoAgentContext(normalizeDemoSnapshot(createSeedSnapshot('v1')),0);expect(()=>validateDemoContext(c)).not.toThrow();expect(validateDemoContext(c).subscriptions[0].name).toBe(c.subscriptions[0].name);});
