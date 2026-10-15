import type { ReactNode } from 'react';
import { AppShell } from '../../src/components/shell/app-shell';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../src/demo/seed';
import { getOverviewAlerts } from '../../src/features/overview/overview-queries';

export default async function ProductLayout({ children }: Readonly<{ children: ReactNode }>) {
  const repository = new DemoFinancialRepository();
  const snapshot = await repository.getSnapshot(DEMO_USER_ID);
  return <AppShell accounts={snapshot.accounts} user={snapshot.users[0]} alerts={getOverviewAlerts(snapshot)}>{children}</AppShell>;
}
