export const UNSUPPORTED_MESSAGE = 'Sorry, we cannot do that for now. We will resolve it as soon as possible. You can contact a human operator for help.';
export function validSupportDestination(value?:string):string|undefined {
 if(!value||value.length>2000||/[\r\n]/.test(value))return;
 try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;
 if(u.protocol==='mailto:'&&/^[^\s?@]+@[^\s?@]+\.[^\s?@]+$/.test(u.pathname)&&!u.search)return u.href;}catch{}
}
