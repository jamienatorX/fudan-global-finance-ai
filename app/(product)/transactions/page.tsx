import { LiveTransactions } from '../../../src/features/demo/live-pages';
type P=Record<string,string|string[]|undefined>;
export default async function Page({searchParams}:{searchParams:Promise<P>}){const p=await searchParams;const s=(v:P[string])=>typeof v==='string'?v:undefined;return <LiveTransactions initialAccount={s(p.account)} initialCurrency={s(p.currency)} initialMonth={s(p.month)} initialSearch={s(p.q)}/>;}
