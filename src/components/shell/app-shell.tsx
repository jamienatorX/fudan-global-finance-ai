import type { ReactNode } from 'react';
import type { Account, User } from '../../domain/entities';
import { formatMoney } from '../../domain/money';
import { AppShellClient } from './app-shell-client';

export function AppShell({ accounts, user, alerts = [], children }: Readonly<{ accounts: readonly Account[]; user: User; alerts?: readonly string[]; children: ReactNode }>) {
  const accountOptions = accounts.map((account) => ({
    id: account.id,
    label: `${account.currency} ${account.type === 'daily' ? 'Daily' : 'Savings'} · ${formatMoney(account.availableBalance)}`,
  }));
  return <AppShellClient accounts={accountOptions} userName={user.profile.displayName} alerts={alerts}>{children}</AppShellClient>;
}
