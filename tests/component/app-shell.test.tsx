import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../../src/components/shell/app-shell';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { createSeedSnapshot, DEMO_USER_ID } from '../../src/demo/seed';
import { OverviewDashboard } from '../../src/features/overview/overview-dashboard';
import { getOverviewModel } from '../../src/features/overview/overview-queries';
import ProductSectionPage from '../../app/(product)/[section]/page';
import ProductLayout from '../../app/(product)/layout';

const navigation = vi.hoisted(() => ({ pathname: '/overview', query: '', pushes: [] as string[] }));
const desktopViewport = { matches: false, listeners: new Set<(event: { matches: boolean }) => void>() };
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
    desktopViewport.matches = false;
    desktopViewport.listeners.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: desktopViewport.matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: (type: string, listener: (event: { matches: boolean }) => void) => {
          if (type === 'change') desktopViewport.listeners.add(listener);
        },
        removeEventListener: (type: string, listener: (event: { matches: boolean }) => void) => {
          if (type === 'change') desktopViewport.listeners.delete(listener);
        },
        dispatchEvent: vi.fn(),
      })),
    });
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

  it('keeps the simulation label exposed in the shell and mobile drawer', () => {
    render(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><p>Accounts</p></AppShell>);
    const badge = within(screen.getByRole('banner')).getByText('Simulated data');
    for (let element: HTMLElement | null = badge; element && element.tagName !== 'HEADER'; element = element.parentElement) {
      expect(element.className).not.toMatch(/(?:^|\s)(?:hidden|\w+:hidden)(?:\s|$)/);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(within(screen.getByRole('dialog', { name: 'Mobile navigation' })).getByText('Simulated data')).toBeInTheDocument();
  });

  it('preserves account context in brand, dashboard, Copilot, and placeholder links', async () => {
    const usdId = snapshot.accounts.find((account) => account.currency === 'USD')!.id;
    navigation.query = `account=${usdId}&unrelated=omit`;
    const model = await getOverviewModel(new DemoFinancialRepository(), DEMO_USER_ID, usdId);
    const { rerender } = render(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><OverviewDashboard overview={model} /></AppShell>);
    for (const name of [/Fudan Global/, 'View accounts', 'Ask AI banker', 'Run competition demo']) {
      const href = screen.getByRole('link', { name }).getAttribute('href')!;
      const url = new URL(href, 'http://localhost');
      expect(url.searchParams.get('account')).toBe(usdId);
      expect(url.searchParams.has('unrelated')).toBe(false);
      if (name === 'Run competition demo') expect(url.searchParams.get('prompt')).toContain('Pay my CNY 5,000');
    }
    expect(within(screen.getByRole('form', { name: 'AI banking command' })).getByDisplayValue(usdId)).toHaveAttribute('name', 'account');
    const page = await ProductSectionPage({ params: Promise.resolve({ section: 'accounts' }) });
    rerender(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}>{page}</AppShell>);
    expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute('href', `/overview?account=${usdId}`);
  });

  it('threads snapshot-derived dashboard alerts into the production layout notifications', async () => {
    render(await ProductLayout({ children: <p>Accounts route</p> }));
    const model = await getOverviewModel(new DemoFinancialRepository(), DEMO_USER_ID);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(`${model.alerts.length} financial alerts`);
    for (const alert of model.alerts) expect(status).toHaveTextContent(alert);
  });

  it('updates notification text and count with snapshot alerts and handles an empty alert list', () => {
    const { rerender } = render(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]} alerts={['December tuition is due 2026-12-15']}><p>Overview</p></AppShell>);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 financial alert');
    expect(screen.getByRole('status')).toHaveTextContent('December tuition is due 2026-12-15');
    expect(screen.getByRole('status')).not.toHaveTextContent('November 1');
    rerender(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]} alerts={[]}><p>Overview</p></AppShell>);
    expect(screen.getByRole('status')).toHaveTextContent('0 financial alerts');
    expect(screen.getByRole('status')).toHaveTextContent('No financial alerts');
    expect(screen.getByRole('status')).not.toHaveTextContent('December tuition');
  });

  it('writes account selection to dashboard URL state', () => {
    const usdAccount = snapshot.accounts.find((account) => account.currency === 'USD')!;
    render(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><p>Dashboard</p></AppShell>);

    fireEvent.change(screen.getByRole('combobox', { name: 'Active account' }), { target: { value: usdAccount.id } });

    expect(navigation.pushes).toEqual([`/overview?account=${usdAccount.id}`]);
  });

  it('keeps account query, selector, and overview balance synchronized across route navigation', async () => {
    const usdAccount = snapshot.accounts.find((account) => account.currency === 'USD')!;
    const repository = new DemoFinancialRepository();
    const { rerender } = render(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><p>Overview</p></AppShell>);
    const navigate = (href: string) => {
      const url = new URL(href, 'http://localhost');
      navigation.pathname = url.pathname;
      navigation.query = url.search.slice(1);
    };
    fireEvent.change(screen.getByRole('combobox', { name: 'Active account' }), { target: { value: usdAccount.id } });
    navigate(navigation.pushes[0]);
    const overview = await getOverviewModel(repository, DEMO_USER_ID, new URLSearchParams(navigation.query).get('account') ?? undefined);
    rerender(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><OverviewDashboard overview={overview} /></AppShell>);

    expect(screen.getByRole('combobox', { name: 'Active account' })).toHaveValue(usdAccount.id);
    expect(screen.getByRole('region', { name: 'Selected account' })).toHaveTextContent('USD 650.00');
    expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', `/accounts?account=${usdAccount.id}`);

    navigate(screen.getByRole('link', { name: 'Accounts' }).getAttribute('href')!);
    rerender(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><p>Accounts route</p></AppShell>);
    expect(screen.getByRole('combobox', { name: 'Active account' })).toHaveValue(usdAccount.id);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', `/overview?account=${usdAccount.id}`);

    navigate(screen.getByRole('link', { name: 'Overview' }).getAttribute('href')!);
    const returnedOverview = await getOverviewModel(repository, DEMO_USER_ID, new URLSearchParams(navigation.query).get('account') ?? undefined);
    rerender(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><OverviewDashboard overview={returnedOverview} /></AppShell>);
    expect(screen.getByRole('combobox', { name: 'Active account' })).toHaveValue(usdAccount.id);
    expect(screen.getByRole('region', { name: 'Selected account' })).toHaveTextContent('USD 650.00');

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const mobileLinks = within(screen.getByRole('navigation', { name: 'Mobile product navigation' })).getAllByRole('link');
    expect(mobileLinks.every((link) => new URL(link.getAttribute('href')!, 'http://localhost').searchParams.get('account') === usdAccount.id)).toBe(true);
  });

  it('resets selection with the dashboard when navigation removes or invalidates the account query', async () => {
    const usdAccount = snapshot.accounts.find((account) => account.currency === 'USD')!;
    const repository = new DemoFinancialRepository();
    const { rerender } = render(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><p>Overview</p></AppShell>);
    fireEvent.change(screen.getByRole('combobox', { name: 'Active account' }), { target: { value: usdAccount.id } });
    navigation.query = `account=${usdAccount.id}`;
    rerender(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><p>USD selected</p></AppShell>);
    expect(screen.getByRole('combobox', { name: 'Active account' })).toHaveValue(usdAccount.id);

    for (const query of ['', 'account=unknown']) {
      navigation.query = query;
      const overview = await getOverviewModel(repository, DEMO_USER_ID, new URLSearchParams(query).get('account') ?? undefined);
      rerender(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><OverviewDashboard overview={overview} /></AppShell>);
      expect(screen.getByRole('combobox', { name: 'Active account' })).toHaveValue(overview.selectedAccount!.id);
      expect(screen.getByRole('region', { name: 'Selected account' })).toHaveTextContent('CNY Daily account');
    }
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

  it('closes the mobile drawer and removes inert state when entering the desktop viewport', () => {
    const { unmount } = render(<AppShell accounts={snapshot.accounts} user={snapshot.users[0]}><p>Dashboard content</p></AppShell>);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'Mobile navigation' })).toBeInTheDocument();
    expect(screen.getByTestId('shell-background')).toHaveAttribute('inert');

    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 64rem)');

    act(() => {
      desktopViewport.matches = true;
      desktopViewport.listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(screen.queryByRole('dialog', { name: 'Mobile navigation' })).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-background')).not.toHaveAttribute('inert');
    expect(screen.getByTestId('shell-background')).not.toHaveAttribute('aria-hidden');
    act(() => {
      desktopViewport.matches = false;
      desktopViewport.listeners.forEach((listener) => listener({ matches: false }));
    });
    expect(screen.queryByRole('dialog', { name: 'Mobile navigation' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'Mobile navigation' })).toBeInTheDocument();
    unmount();
    expect(desktopViewport.listeners.size).toBe(0);
  });
});
