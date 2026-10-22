import {expect,it} from 'vitest';
import {createSeedSnapshot} from '../../src/demo/seed';
import {demoAgentContext,withSampleHistory,verifyProposal} from '../../src/agent/context-adapters';
import {detectRecurring} from '../../src/agent/recurring-detection';
it('does not fabricate evidence; explicit sample history is idempotent and leaves balances alone',()=>{
 const s=createSeedSnapshot('v1'),c=demoAgentContext(s,0);expect(detectRecurring(c)).toEqual([]);
 const next=withSampleHistory(s);expect(detectRecurring(demoAgentContext(next,1)).length).toBeGreaterThan(0);
 expect(next.accounts).toEqual(s.accounts);expect(withSampleHistory(next).transactions).toEqual(next.transactions);
});
it('verifies the requested target state rather than trusting an execution message',()=>{
 const c=demoAgentContext(createSeedSnapshot('v1'),0),card=c.cards[0],payload={type:'card' as const,cardId:card.id,mode:'freeze'};
 expect(verifyProposal(payload,c)).toBe(false);card.frozen=true;expect(verifyProposal(payload,c)).toBe(true);
});
