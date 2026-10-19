import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { DemoProvider } from '../../src/demo/demo-context';
import { ApprovalDrawer } from '../../src/features/demo/approval-drawer';
import { PortfolioQuickActions, PortfolioActivityPanel } from '../../src/features/investing/portfolio-actions';
import { CashFlowCurve } from '../../src/features/overview/cash-flow-curve';
import { buildCashFlowSeries } from '../../src/features/overview/cash-flow-series';
import { createSeedSnapshot } from '../../src/demo/seed';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
beforeEach(() => localStorage.clear());
it('reviews a withdrawal and records it only after confirmation', () => {
  render(<DemoProvider><PortfolioQuickActions /><PortfolioActivityPanel /><ApprovalDrawer /></DemoProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
  const dialog = screen.getByRole('dialog', { name: 'Withdraw from investments' });
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Withdrawal amount' }), { target: { value: '100' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Review withdrawal' }));
  expect(screen.getByRole('region', { name: 'Review and confirmation' })).toHaveTextContent('CNY 100.00');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  fireEvent.click(screen.getByRole('button', { name: 'Withdrawn' }));
  expect(screen.getByRole('region', { name: 'Investment movements' })).toHaveTextContent('CNY 100.00');
  expect(screen.getByRole('status')).toHaveTextContent('Simulated redeem completed');
});
it('shows a new date window when the graph period changes', () => {
  render(<CashFlowCurve history={buildCashFlowSeries(createSeedSnapshot('v1'))} />);
  expect(screen.getByRole('img', { name: /over 30 days/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Week' }));
  expect(screen.getByRole('img', { name: /over 7 days/ })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: 'Inspect cash flow date' })).toHaveAttribute('max', '6');
});
