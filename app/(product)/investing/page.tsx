import { RelocatedDetails } from '../../../src/features/overview/relocated-details';
import { InvestingWorkspace } from '../../../src/features/investing/investing-workspace';

export default async function InvestingPage({ searchParams }: { searchParams: Promise<{ asset?: string; instrument?: string }> }) {
  const params = await searchParams;
  return <div className="student-relocated-details"><InvestingWorkspace key={params.instrument ?? params.asset ?? 'all'} initialAsset={params.asset} initialInstrument={params.instrument} /><RelocatedDetails section="investing" /></div>;
}
