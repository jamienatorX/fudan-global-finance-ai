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

it('keeps the merchant in a help-me-plan request without relying on a model guess',async()=>{
 const {readOnlyConversationUpdate}=await import('../../src/agent/conversation-read-fallback');
 const c=demoAgentContext(normalizeDemoSnapshot(createSeedSnapshot('v1')),0),state=newConversation('demo');
 const message='Help me plan Spotify tomorrow and cancel Taobao 88VIP next week. Do not pay or cancel anything yet.';
 const update=readOnlyConversationUpdate(message,state,c);
 expect(update?.tasks.map(t=>t.target)).toEqual(['Spotify','Taobao 88VIP']);
 const result=advanceConversation(state,update!,c,message);
 expect(result.state.messages.at(-1)?.content).toContain('Spotify');
 expect(result.state.messages.at(-1)?.content).toContain('Taobao 88VIP');
 expect(result.tasks.every(t=>!t.plan?.actions.length)).toBe(true);
});
it('includes budget impact in the chat reply alongside a subscription plan and missing recipient',()=>{
 const c=demoAgentContext(normalizeDemoSnapshot(createSeedSnapshot('v1')),0);
 const result=advanceConversation(newConversation('demo'),{tasks:[{...blankTask('transfer'),target:'Evan',source:'daily',currency:'CNY',amountMinor:'50000'},{...blankTask('subscription_payment'),target:'Taobao 88VIP',currency:'CNY',amountMinor:'8800',mode:'plan'},{...blankTask('affordability'),currency:'CNY',amountMinor:'100000'},{...blankTask('read'),query:'Show my budgets'}],removeIds:[]},c,'Send 500 yuan to Evan, plan Taobao 88VIP for 88 yuan and review whether I can spend another 1000 yuan.');
 const reply=result.state.messages.at(-1)!.content;
 expect(reply).toContain('Taobao 88VIP');expect(reply).toContain('CNY 24150.00');expect(reply).toContain('monthly budget');expect(reply).toContain('CNY -1000.00');expect(reply).toMatch(/payment.*excluded/i);expect(reply).toContain('Evan');
});
it('keeps Chinese budget results visible alongside a subscription plan',()=>{
 const c=demoAgentContext(normalizeDemoSnapshot(createSeedSnapshot('v1')),0);
 const r=advanceConversation(newConversation('demo'),{tasks:[{...blankTask('subscription_payment'),target:'Spotify',mode:'plan',schedule:'tomorrow'},{...blankTask('affordability'),currency:'CNY',amountMinor:'100000'}],removeIds:[]},c,'帮我计划订阅Spotify，也看看还能花1000元吗？');
 expect(r.state.messages.at(-1)?.content).toContain('Spotify');expect(r.state.messages.at(-1)?.content).toContain('方案后的月度预算余额');expect(r.state.messages.at(-1)?.content).toContain('CNY -1000.00');
});
