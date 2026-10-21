import { LocalizedDiv, LocalizedP } from '../../../src/i18n/localized';
import { Suspense } from 'react';
import { RemittanceWorkspace } from '../../../src/features/fx/remittance-workspace';
import { TransfersWorkspace } from '../../../src/features/demo/scenario-workspaces';
export default async function Page({searchParams}:{searchParams:Promise<{mode?:string;source?:string;destination?:string}>}) { const params=await searchParams; return <LocalizedDiv className="student-relocated-details">{params.mode!=='internal'?<Suspense fallback={<LocalizedP>Loading remittance…</LocalizedP>}><RemittanceWorkspace /></Suspense>:null}<TransfersWorkspace internalOnly={params.mode==='internal'} sourceId={params.source} destinationId={params.destination}/></LocalizedDiv>; }
