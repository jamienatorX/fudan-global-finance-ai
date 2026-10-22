export const FEATURES = [
 {path:'/overview',name:'Overview',help:'Balances and commitments'},
 {path:'/accounts',name:'Accounts',help:'Owned accounts and available balances'},
 {path:'/transfers',name:'Transfers',help:'Confirmed same-currency transfers; demo recipients and scheduling'},
 {path:'/transactions',name:'Transactions',help:'Search available records; CSV preview on its dedicated screen'},
 {path:'/wealth',name:'Wealth',help:'Fictional products, holdings, confirmed buy/redeem'},
 {path:'/cards',name:'Cards',help:'Read, freeze, unfreeze, monthly limits'},
 {path:'/subscriptions',name:'Subscriptions',help:'Evidence and simulated cancellation'},
 {path:'/fx',name:'FX',help:'Reference conversion only; no currency execution'},
 {path:'/planner',name:'Planner',help:'Budgets, runway and confirmed tuition payments'},
 {path:'/copilot',name:'Fufu',help:'Banking agent'},
 {path:'/audit',name:'Audit',help:'Available activity and receipts'},
 {path:'/settings',name:'Settings',help:'Dedicated profile, reset and security workflows'},
] as const;
export type AgentFeature = typeof FEATURES[number];
export const capabilityFor = (feature:string,source:string) => ({
 available:FEATURES.some(f=>f.path===feature),
 beneficiaryTransfers:source.startsWith('browser-local'),
 scheduledTransfers:source.startsWith('browser-local'),
 currencyExecution:false,
});
