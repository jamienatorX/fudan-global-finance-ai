import { LiveOverview } from '../../../src/features/demo/live-pages';
export default async function Page({searchParams}:{searchParams:Promise<{account?:string|string[]}>}){const p=await searchParams;return <LiveOverview account={typeof p.account==='string'?p.account:undefined}/>;}
