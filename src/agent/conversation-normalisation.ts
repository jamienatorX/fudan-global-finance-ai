/** Canonicalise read-only intents; no operation here can create a banking action. */
export function canonicalReadQuery(query:string):string{
 if(/\b(fx|forex|exchange rates?|currency conversion)\b|汇率|换汇|外汇/.test(query.toLowerCase()))return 'Open fx';
 if(/\b(balances?|accounts?|how much money)\b|余额/.test(query.toLowerCase())&&!/transfer|转账/i.test(query))return 'Show my balances';
 if(/\b(products?|investments?|portfolio|holdings)\b|投资产品/.test(query.toLowerCase()))return 'Show investment products';
 if(/\b(budgets?)\b|预算/.test(query.toLowerCase()))return 'Show my budgets';
 if(/\btuition\b|学费/.test(query.toLowerCase()))return 'Show my tuition';
 return query;
}
export const explicitWithdrawal=(s:string)=>/\b(skip|remove|forget|drop|cancel request)\b|\b(do not|don't|never mind|nevermind|no longer)\b|跳过|取消|不要|算了/.test(s.toLowerCase());
export function normalisePlanDate(value:string,at=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);const year=Number(parts.find(p=>p.type==='year')?.value);
 const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
 const m=value.trim().match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/i);if(!m)return value;
 const month=months.findIndex(n=>n===m[1].toLowerCase()||n.slice(0,3)===m[1].toLowerCase());if(month<0)return value;
 const iso=String(Number(m[3]||year))+'-'+String(month+1).padStart(2,'0')+'-'+m[2].padStart(2,'0');const date=new Date(iso+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==iso)return value;
 const today=parts.find(p=>p.type==='year')?.value+'-'+parts.find(p=>p.type==='month')?.value+'-'+parts.find(p=>p.type==='day')?.value;if(!m[3]&&iso<today)return value;
 return iso;
}
