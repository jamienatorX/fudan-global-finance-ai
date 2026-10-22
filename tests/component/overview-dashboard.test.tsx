import { render, screen } from '@testing-library/react';
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
  it('keeps the overview focused and preserves its reconciled totals', async () => {
    const overview = await getOverviewModel(new DemoFinancialRepository(), DEMO_USER_ID);
    render(<OverviewDashboard overview={overview} />);
    expect(screen.getByRole('heading', { name: /(Good morning|Good afternoon|Good evening|Welcome), Jim/ })).toBeInTheDocument();
    expect(screen.getByText('Sandbox · fictional funds')).toBeInTheDocument();
    expect(screen.getByText('CNY 40,201.36')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Net worth and cash' })).toHaveTextContent('CNY 38,669.36');
    const tuitionHeading = screen.getByRole('heading', { name: 'Upcoming tuition' });
    const alertsHeading = screen.getByRole('heading', { name: 'Financial alerts' });
    expect(alertsHeading.compareDocumentPosition(tuitionHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Financial alerts' })).toHaveTextContent('Monthly budget fully used');
    expect(screen.getByRole('region', { name: 'Financial alerts' })).toHaveTextContent('Not enough history');
    expect(screen.queryByText('Unusually large food purchase')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('recent-transaction')).toHaveLength(5);
    expect(screen.getByRole('region', { name: 'Banking shortcuts' })).toBeInTheDocument();
    for (const title of ['Multi-currency balances','Spending by category','Investment portfolio','3-month cash-flow forecast','Budget health']) {
      expect(screen.queryByRole('heading', { name: title })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('group', { name: 'Membership progress' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View transaction/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Review budget/})).toHaveAttribute('href','/planner');
  });
});
