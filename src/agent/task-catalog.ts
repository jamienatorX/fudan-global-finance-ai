import type {TaskKind} from './conversation-contracts';
export const TASK_CATALOG:{name:string;kind:TaskKind;query?:string;mode?:string}[]=[
 {name:'Balances & spending',kind:'read',query:'Show my balances'},
 {name:'Send money',kind:'transfer'},{name:'Review my budget',kind:'affordability'},
 {name:'Change a budget',kind:'budget'},{name:'Pay tuition',kind:'tuition'},
 {name:'Subscriptions',kind:'read',query:'Find recurring payments'},{name:'Cancel subscription',kind:'cancel_subscription'},
 {name:'Card controls',kind:'card',mode:'freeze'},{name:'Investments',kind:'investment',mode:'buy'},
 {name:'Currency reference',kind:'read',query:'Open fx'},{name:'Activity & help',kind:'read',query:'Show audit history'},
];
