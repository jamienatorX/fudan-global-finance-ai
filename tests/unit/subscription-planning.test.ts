import {it,expect} from 'vitest';
import {advanceConversation} from '../../src/agent/conversation-controller';
import {blankTask,newConversation} from '../../src/agent/conversation-contracts';
import {demoAgentContext} from '../../src/agent/context-adapters';
import {createSeedSnapshot,normalizeDemoSnapshot} from '../../src/demo/seed';
it('plans Spotify tomorrow and Taobao next week without blanket rejection or execution',()=>{
 const c=demoAgentContext(normalizeDemoSnapshot(createSeedSnapshot('v1')),0);
 const r=advanceConversation(newConversation('demo'),{tasks:[{...blankTask('subscription_payment'),target:'Spotify',schedule:'tomorrow'},{...blankTask('cancel_subscription'),target:'Taobao',schedule:'next week'}],removeIds:[]},c,'can plan a new plan, i want to buy spotify account tmrw and i want to cancel my taobao 88 membership nextweek, can u plan this');
 const text=r.state.messages.at(-1)!.content;
 expect(text).toContain('Spotify');expect(text).toContain('tomorrow');expect(text).toContain('Taobao 88VIP');expect(text).toContain('next week');expect(text).toMatch(/price|cost/);expect(text).toMatch(/exact.*date/);expect(text).not.toContain('Sorry, we cannot');expect(r.tasks.every(t=>!t.plan?.actions.length)).toBe(true);expect(r.state.messages.at(-1)?.links).toEqual([{href:'/subscriptions',label:'Review subscriptions'}]);
});
it('keeps follow-ups in planning mode until an explicit separate execution request',()=>{
 const c=demoAgentContext(normalizeDemoSnapshot(createSeedSnapshot('v1')),0);const first=advanceConversation(newConversation('demo'),{tasks:[{...blankTask('cancel_subscription'),target:'Taobao',schedule:'next week'}],removeIds:[]},c,'can you plan my Taobao cancellation?');const old=first.state.drafts[0];const next=advanceConversation(first.state,{tasks:[{...blankTask('cancel_subscription'),...old,mode:'',schedule:'2026-10-30'}],removeIds:[]},c,'October 30 please');expect(next.state.drafts[0].mode).toBe('plan');expect(next.tasks[0].plan?.actions??[]).toEqual([]);
});

it('recovers explicit merchants and relative dates when the model leaves targets blank',()=>{const c=demoAgentContext(normalizeDemoSnapshot(createSeedSnapshot('v1')),0);const r=advanceConversation(newConversation('demo'),{tasks:[blankTask('subscription_payment'),blankTask('cancel_subscription')],removeIds:[]},c,'can plan a new plan, i want to buy spotify account tmrw and i want to cancel my taobao 88 membership nextweek, can u plan this');expect(r.state.drafts.map(d=>[d.target,d.schedule])).toEqual([['Spotify','tomorrow'],['Taobao 88VIP','next week']]);expect(r.state.messages.at(-1)?.content).toContain('Taobao 88VIP');});
