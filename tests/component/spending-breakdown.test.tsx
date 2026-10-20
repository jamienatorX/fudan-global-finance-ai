import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { createSeedSnapshot, DEMO_USER_ID } from '../../src/demo/seed';
import { formatMoney, money } from '../../src/domain/money';
import { displayOverviewCurrency } from '../../src/features/overview/overview-currency';
import { getOverviewModel } from '../../src/features/overview/overview-queries';
import { SpendingBreakdown } from '../../src/features/overview/spending-breakdown';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

describe('SpendingBreakdown', () => {
  it('keeps the chart total and every category amount in the selected reporting currency', async () => {
    const base = await getOverviewModel(new DemoFinancialRepository(), DEMO_USER_ID);
    const overview = displayOverviewCurrency(base, 'IDR', createSeedSnapshot('v1').exchangeRates);
    render(<SpendingBreakdown overview={overview} />);
    const chart = screen.getByRole('img', { name: `Spending category chart. Total ${formatMoney(overview.monthlyExpenses)}` });
    expect(within(chart).getByText(formatMoney(overview.monthlyExpenses).replace(/\s+/g, ' '))).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Category amounts' })).getAllByRole('listitem');
    expect(items).toHaveLength(overview.spending.length);
    overview.spending.forEach((category, index) => {
      expect(within(items[index]).getByText(category.category)).toBeInTheDocument();
      expect(within(items[index]).getByText(formatMoney(category.amount).replace(/\s+/g, ' '))).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'View analysis' })).toHaveAttribute('href', '/transactions');
  });

  it('shows an honest zero total and empty state when there is no spending', async () => {
    const base = await getOverviewModel(new DemoFinancialRepository(), DEMO_USER_ID);
    const { container } = render(<SpendingBreakdown overview={{ ...base, monthlyExpenses: money(0n, 'CNY'), spending: [] }} />);
    expect(screen.getByText('CNY 0.00')).toBeInTheDocument();
    expect(screen.getByText('No spending recorded this month.')).toBeInTheDocument();
    expect(container.querySelectorAll('circle[stroke-dasharray]')).toHaveLength(0);
  });
});
