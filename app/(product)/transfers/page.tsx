import { LocalizedDiv, LocalizedP } from '../../../src/i18n/localized';
import { Suspense } from 'react';
import { RemittanceWorkspace } from '../../../src/features/fx/remittance-workspace';
import { TransfersWorkspace } from '../../../src/features/demo/scenario-workspaces';
export default function Page() { return <LocalizedDiv className="student-relocated-details"><Suspense fallback={<LocalizedP>Loading remittance…</LocalizedP>}><RemittanceWorkspace /></Suspense><TransfersWorkspace /></LocalizedDiv>; }
