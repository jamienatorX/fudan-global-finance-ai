import {blankTask,type ConversationUpdate} from './conversation-contracts';
/** Complete, bounded information requests only. Unrecognised words leave the entire request to the model. */
export function informationUpdate(message:string):ConversationUpdate|undefined{
 const text=message.normalize('NFKC').trim(),chinese=/[\u3400-\u9fff]/.test(text);
 const reply=(content:string):ConversationUpdate=>({reply:content,tasks:[],removeIds:[]});
 if(/^(?:hi|hello|hey)(?:\s+fufu)?[!.\s]*$|^(?:你好|您好|嗨)(?:福福|fufu)?[！!。\s]*$/i.test(text))return reply(chinese?'你好，我是 Fufu！你可以问我余额、消费、预算或订阅，也可以一起整理转账计划。你想先了解什么？':'Hi, I’m Fufu! Ask about your balances, spending, budgets or subscriptions, or we can work through a banking task together. What would you like to do?');
 if(/^(?:thanks|thank you)(?:\s+fufu)?[!.\s]*$|^(?:谢谢|谢谢你|感谢)[！!。\s]*$/i.test(text))return reply(chinese?'不客气！需要时可以继续问我，或查看下一项任务。':'You’re welcome! Ask another question whenever you’re ready, or we can continue with your next task.');
 if(/^(?:what can you (?:do|help me with)|how can you help(?: me)?|help(?: me)?|what can i ask(?: you)?)[?!\.\s]*$|^(?:你能做什么|你能帮我什么|你可以做什么|帮助)[？?！!。\s]*$/i.test(text))return reply(chinese?'我可以查询已记录的余额、消费、预算、交易和订阅，帮你比较虚拟投资，并整理转账、卡片或取消订阅的草稿。你可以直接描述需求，也可以选择任务。商户购买和自动未来付款暂未接入；任何更改都需要单独核对和明确确认。':'I can explain recorded balances, spending, budgets, transactions and subscriptions, compare fictional investments, and help draft transfers, card changes or supported subscription cancellations. Tell me what you need or choose a task. Merchant purchases and automatic future payments aren’t connected. Every change needs separate review and exact confirmation.');
 if(/^(?:yes|ok|okay|sure|confirm|go ahead)[!.\s]*$|^(?:是的|好的|确认|可以)[！!。\s]*$/i.test(text))return reply(chinese?'我会保留当前草稿。聊天中的“确认”不会执行操作：请先点击“Review this change”，核对具体内容，再使用明确确认按钮。':'Your drafts are still here. A chat reply does not approve a change: choose “Review this change”, check the exact details, then use the confirmation button.');
 // Do not turn a request for a different reporting period into this month's answer.
 if(/\b(last|previous|annual|year|yesterday|week)\b|上月|去年|年度|昨天|上周/i.test(text))return;
 const remainder=text.replace(/\b(?:please|can|could|would|you|me|my|mine|i|we|our|us|do|did|have|has|how|much|what|which|are|is|this|month|monthly|current|recorded|available|remaining|total|daily|savings|bank|money|balances?|accounts?|and|also|with|the|their|its|in|on|for|of|a|an|show|list|check|view|tell|explain|summari[sz]e|find|recent|latest|cards?|status|limits?|frozen|active|spending|spend|spent|expenses|bills|transactions?|history|audit|activity|receipts?|investments?|products?|holdings|portfolio|budgets?|tuition|fees|due|outstanding|fx|forex|exchange|rates?|currency|conversion|cny|rmb|yuan|sgd|usd|idr|recurring|payments?|charges?|subscriptions?|renewals?|confidence|supporting|settled|evidence|reasons|cancellation|capability|capabilities|dates?)\b/gi,'').replace(/这个月|花了多少钱|最近交易记录|交易记录|活动记录|操作记录|审计记录|投资产品|银行卡|卡片|账户|本月|我的|看看|查看|显示|列出|帮我|请|余额|预算|花了|多少钱|支出|消费|最近|交易|状态|限额|和|及|我|有哪些|订阅|续费|定期扣款|置信度|证据|学费|持仓|汇率/g,'').replace(/[\s.,!?，。？！、:：]/g,'');
 if(remainder)return;
 const queries:string[]=[];
 if(/\b(balances?|accounts?|how much money)\b|余额|账户/i.test(text))queries.push('Show my balances');
 if(/\bbudgets?\b|预算/i.test(text))queries.push('Show my budgets');
 if(/\b(spending|spend|spent|expenses|bills)\b|消费|支出|花了/i.test(text))queries.push('Explain spending this month');
 if(/\btransactions?\b|交易/i.test(text))queries.push(/\bthis month\b|\bmonthly\b|本月|这个月/i.test(text)?'Show transactions this month':'Show recent transactions');
 if(/\b(audit|activity|receipts?)\b|活动记录|操作记录|审计记录/i.test(text))queries.push('Show audit history');
 if(/\bcards?\b|银行卡|卡片/i.test(text))queries.push('Show my cards');
 if(/\b(products?|investments?|holdings|portfolio)\b|投资产品|持仓/i.test(text))queries.push('Show investment products');
 if(/\btuition\b|学费/i.test(text))queries.push('Show my tuition');
 if(/\b(fx|forex|exchange|currency)\b|汇率/i.test(text))queries.push('Open fx');
 if(/\b(recurring|subscriptions?|renewals?)\b|订阅|续费|定期扣款/i.test(text))queries.push('Find recurring payments');
 if(/\b(due|outstanding)\b/i.test(text)&&queries.some(q=>q!=='Show my tuition'))return;
 if(queries.includes('Explain spending this month')&&/\b(CNY|RMB|yuan|SGD|USD|IDR|daily|savings|accounts?)\b|账户/i.test(text))return;
 if(queries.includes('Show my cards')&&/\b(frozen|active)\b/i.test(text))return;
 if(!queries.length||queries.length>6)return;
 return{tasks:queries.map(query=>({...blankTask('read'),query})),removeIds:[]};
}
