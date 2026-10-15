import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../src/demo/seed';
import { OverviewDashboard } from '../../src/features/overview/overview-dashboard';
import { getOverviewModel, overviewQueryKeys } from '../../src/features/overview/overview-queries';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

describe('overview queries', () => {
  it('derives reporting totals from the repository snapshot without double-counting transfers or investments', async () => {
    const model = await getOverviewModel(new DemoFinancialRepository(), DEMO_USER_ID);

    expect(model.totalNetWorth.amountMinor).toBe(4_020_136n);
    expect(model.availableCash.amountMinor).toBe(3_866_936n);
    expect(model.monthlyIncome.amountMinor).toBe(2_939_545n);
    expect(model.monthlyExpenses.amountMinor).toBe(520_000n);
    expect(model.monthlyCashFlow.amountMinor).toBe(2_419_545n);
    expect(model.budget.usedBasisPoints).toBe(10_000);
    expect(model.subscriptions.monthly.amountMinor).toBe(15_000n);
    expect(model.tuition.outstanding.amountMinor).toBe(500_000n);
    expect(model.cashRunwayMonths).toBe(6.5);
    expect(model.forecast.map((point) => point.closing.amountMinor)).toEqual([3_301_481n, 3_236_026n, 3_170_571n]);
    expect(model.fxSource).toMatchObject({ source: 'fallback', provider: 'Demo reference fixture (not live)' });
    expect(overviewQueryKeys.summary(DEMO_USER_ID)).toEqual(['overview', DEMO_USER_ID, 'summary']);
  });
});

describe('OverviewDashboard', () => {
  it('renders financial context, commitments, activity, and an actionable command bar', async () => {
    const overview = await getOverviewModel(new DemoFinancialRepository(), DEMO_USER_ID);
    render(<OverviewDashboard overview={overview} />);

    expect(screen.getByRole('heading', { name: /Good morning, Ayu/ })).toBeInTheDocument();
    expect(screen.getByText('CNY 40,201.36')).toBeInTheDocument();
    expect(screen.getAllByText('CNY 5,200.00').length).toBeGreaterThan(0);
    expect(screen.getByText('100% used')).toBeInTheDocument();
    expect(screen.getByText('CNY 150.00 / month')).toBeInTheDocument();
    expect(screen.getByText('CNY 5,000.00 outstanding')).toBeInTheDocument();
    expect(screen.getByText('6.5 months')).toBeInTheDocument();
    expect(screen.getByText(/Fallback FX/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3-month cash-flow forecast' })).toBeInTheDocument();
    expect(screen.getByText('CNY 33,014.81')).toBeInTheDocument();

    const command = screen.getByRole('form', { name: 'AI banking command' });
    expect(within(command).getByRole('textbox', { name: 'What would you like your AI banker to do?' })).toBeInTheDocument();
    expect(within(command).getByRole('button', { name: 'Plan with AI' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Run competition demo' })).toHaveAttribute('href', expect.stringContaining('/copilot?prompt='));

    expect(screen.getByRole('heading', { name: 'Recent transactions' })).toBeInTheDocument();
    expect(screen.getAllByTestId('recent-transaction')).toHaveLength(5);
    expect(screen.getByRole('heading', { name: 'Subscriptions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tuition plan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Multi-currency balances' })).toBeInTheDocument();
    expect(screen.getByText('IDR 2,500,000')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Investment portfolio' })).toBeInTheDocument();
    expect(screen.getByText('2 holdings')).toBeInTheDocument();
    expect(screen.getByText('CNY 1,532.00')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI insight' })).toBeInTheDocument();
    expect(screen.getByText(/save CNY 816.00 per year/)).toBeInTheDocument();
    expect(screen.getByText('No agent actions yet')).toBeInTheDocument();
  });

  it('shows the selected account and derives labels and counts from the model', async () => {
    const repository = new DemoFinancialRepository();
    const accounts = await repository.listAccounts(DEMO_USER_ID);
    const usdAccount = accounts.find((account) => account.currency === 'USD')!;
    const base = await getOverviewModel(repository, DEMO_USER_ID, usdAccount.id);
    const overview = {
      ...base,
      fxSource: { ...base.fxSource, source: 'live' as const, provider: 'Live fixture' },
      accountBalances: base.accountBalances.slice(0, 2),
      budget: { ...base.budget, categories: base.budget.categories.slice(0, 3) },
      agentActivityCount: 2,
    };
    render(<OverviewDashboard overview={overview} />);

    const selected = screen.getByRole('region', { name: 'Selected account' });
    expect(within(selected).getByText('USD 650.00')).toBeInTheDocument();
    expect(within(selected).getByText(/CNY 4,615.00 reporting/)).toBeInTheDocument();
    expect(screen.getByText(/Live FX/)).toBeInTheDocument();
    expect(screen.getByText('2 active accounts')).toBeInTheDocument();
    expect(screen.getByText('3 categories')).toBeInTheDocument();
    expect(screen.getByText('2 agent events recorded')).toBeInTheDocument();
  });
});
