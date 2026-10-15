import { DemoFinancialRepository } from '../../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../../src/demo/seed';
import { OverviewDashboard } from '../../../src/features/overview/overview-dashboard';
import { getOverviewModel } from '../../../src/features/overview/overview-queries';

export default async function OverviewPage({ searchParams }: Readonly<{ searchParams: Promise<{ account?: string | readonly string[] }> }>) {
  const parameters = await searchParams;
  const accountId = typeof parameters.account === 'string' ? parameters.account : undefined;
  const repository = new DemoFinancialRepository();
  const overview = await getOverviewModel(repository, DEMO_USER_ID, accountId);
  return <OverviewDashboard overview={overview} />;
}
