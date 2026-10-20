import { Suspense } from 'react';
import { RemittanceWorkspace } from '../../../src/features/fx/remittance-workspace';
import { TransfersWorkspace } from '../../../src/features/demo/scenario-workspaces';
export default function Page() { return <div className="student-relocated-details"><Suspense fallback={<p>Loading remittance…</p>}><RemittanceWorkspace /></Suspense><TransfersWorkspace /></div>; }
