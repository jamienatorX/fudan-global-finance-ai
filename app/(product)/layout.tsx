import type { ReactNode } from 'react';
import { FxReferenceProvider } from '../../src/features/fx/fx-reference-context';
import { DemoProvider } from '../../src/demo/demo-context';
import { ApprovalDrawer } from '../../src/features/demo/approval-drawer';
import { AppShell } from '../../src/components/shell/app-shell';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../src/demo/seed';
import { getOverviewAlerts } from '../../src/features/overview/overview-queries';

import { InvestingPreferencesProvider } from '../../src/features/investing/investing-preferences';

export default async function ProductLayout({ children }: Readonly<{ children: ReactNode }>) {
  const repository = new DemoFinancialRepository();
  const snapshot = await repository.getSnapshot(DEMO_USER_ID);
  return <DemoProvider><FxReferenceProvider><InvestingPreferencesProvider><AppShell accounts={snapshot.accounts} user={snapshot.users[0]} alerts={getOverviewAlerts(snapshot)}>{children}</AppShell><ApprovalDrawer /></InvestingPreferencesProvider></FxReferenceProvider></DemoProvider>;
}
