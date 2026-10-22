import {it,expect} from 'vitest';
import {advanceConversation} from '../../src/agent/conversation-controller';
import {blankTask,newConversation} from '../../src/agent/conversation-contracts';
import {demoAgentContext} from '../../src/agent/context-adapters';
import {createSeedSnapshot} from '../../src/demo/seed';
it('answers both sides of the IDR/SGD question using current website balances',()=>{
 const c=demoAgentContext(createSeedSnapshot('v1'),0);
 const turn=advanceConversation(newConversation('demo'),{tasks:[{...blankTask('affordability'),currency:'IDR',amountMinor:'10000'},{...blankTask('affordability'),currency:'SGD',amountMinor:'10000'}],removeIds:[]},c,'if i spend 10,000 idr can i still pay 100 sgd tmrw');
 expect(turn.impacts?.map(r=>[r.currency,r.cashRemainingMinor])).toEqual([['IDR','2490000'],['SGD','32000']]);
 expect(turn.state.messages.at(-1)?.content).toContain('SGD 320.00');expect(turn.state.messages.at(-1)?.content).toContain('IDR 2490000');
 expect(turn.tasks.every(t=>!t.plan?.actions.length)).toBe(true);
 c.accounts!.find(a=>a.currency==='SGD')!.availableMinor='5000';
 const updated=advanceConversation(newConversation('demo'),{tasks:[{...blankTask('affordability'),currency:'IDR',amountMinor:'10000'},{...blankTask('affordability'),currency:'SGD',amountMinor:'10000'}],removeIds:[]},c,'can i afford both?');
 expect(updated.state.messages.at(-1)?.content).toContain('short');
});
it('adds multiple spending amounts in the same currency once',()=>{
 const c=demoAgentContext(createSeedSnapshot('v1'),0);
 const r=advanceConversation(newConversation('demo'),{tasks:[{...blankTask('affordability'),currency:'SGD',amountMinor:'10000'},{...blankTask('affordability'),currency:'SGD',amountMinor:'5000'}],removeIds:[]},c,'spend 100 SGD and 50 SGD');
 expect(r.impacts).toHaveLength(1);expect(r.impacts?.[0].cashRemainingMinor).toBe('27000');
});
