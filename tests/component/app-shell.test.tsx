import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../../src/components/shell/app-shell';
import { createSeedSnapshot } from '../../src/demo/seed';

const navigation = vi.hoisted(() => ({ pathname: '/overview', query: '', pushes: [] as string[] }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: (href: string) => navigation.pushes.push(href) }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

describe('AppShell', () => {
  const snapshot = createSeedSnapshot('v1');

  beforeEach(() => {
    navigation.pathname = '/overview';
    navigation.query = '';
    navigation.pushes = [];
  });

  it('exposes all twelve product destinations and the persistent banking controls', () => {
    render(
      <AppShell accounts={snapshot.accounts} user={snapshot.users[0]}>
        <p>Dashboard content</p>
      </AppShell>,
    );

    const primaryNavigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    const destinations = within(primaryNavigation).getAllByRole('link');
    expect(destinations).toHaveLength(12);
    expect(destinations.map((link) => link.getAttribute('href'))).toEqual([
      '/overview', '/accounts', '/transfers', '/transactions', '/wealth', '/cards',
      '/subscriptions', '/fx', '/planner', '/copilot', '/audit', '/settings',
    ]);
    expect(screen.getByRole('combobox', { name: 'Active account' })).toHaveValue(snapshot.accounts[0].id);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getAllByText('Simulated data').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Ask AI banker' })).toHaveAttribute('href', '/copilot');
    expect(screen.getByText('Search coming in Phase 2')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('uses the current pathname for navigation state', () => {
    navigation.pathname = '/accounts';
    render(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><p>Accounts</p></AppShell>);

    expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('writes account selection to dashboard URL state', () => {
    const usdAccount = snapshot.accounts.find((account) => account.currency === 'USD')!;
    render(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><p>Dashboard</p></AppShell>);

    fireEvent.change(screen.getByRole('combobox', { name: 'Active account' }), { target: { value: usdAccount.id } });

    expect(navigation.pushes).toEqual([`/overview?account=${usdAccount.id}`]);
  });

  it('collapses the desktop sidebar and opens a keyboard-operable mobile navigation drawer', () => {
    render(
      <AppShell accounts={snapshot.accounts} user={snapshot.users[0]}>
        <p>Dashboard content</p>
      </AppShell>,
    );

    const collapse = screen.getByRole('button', { name: 'Collapse sidebar' });
    fireEvent.click(collapse);
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');

    const opener = screen.getByRole('button', { name: 'Open navigation' });
    opener.focus();
    fireEvent.click(opener);
    const drawer = screen.getByRole('dialog', { name: 'Mobile navigation' });
    const mobileNavigation = within(drawer).getByRole('navigation', { name: 'Mobile product navigation' });
    expect(within(mobileNavigation).getAllByRole('link')).toHaveLength(12);
    expect(screen.getByTestId('shell-background')).toHaveAttribute('inert');

    const close = within(drawer).getByRole('button', { name: 'Close navigation' });
    expect(close).toHaveFocus();
    const lastLink = within(mobileNavigation).getByRole('link', { name: 'Settings & Security' });
    lastLink.focus();
    fireEvent.keyDown(drawer, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(drawer, { key: 'Tab', shiftKey: true });
    expect(lastLink).toHaveFocus();

    fireEvent.keyDown(drawer, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Mobile navigation' })).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-background')).not.toHaveAttribute('inert');
    return waitFor(() => expect(opener).toHaveFocus());
  });
});
