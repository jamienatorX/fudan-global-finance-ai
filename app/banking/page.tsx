import {BankingWorkspace} from '../../src/features/banking/banking-workspace';
export default async function BankingPage({searchParams}:{searchParams:Promise<{tab?:string}>}){const params=await searchParams;return <BankingWorkspace key={params.tab??'overview'} initialTab={params.tab} supportDestination={process.env.FU_BANK_SUPPORT_URL}/>;}
