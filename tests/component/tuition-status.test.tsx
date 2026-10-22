import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createSeedSnapshot, DEMO_USER_ID } from '../../src/demo/seed';
import type { FinancialRepository } from '../../src/domain/financial-repository';
import type { FinancialSnapshot } from '../../src/domain/entities';
import { getOverviewModel } from '../../src/features/overview/overview-queries';
import { TuitionFxCard } from '../../src/features/overview/tuition-fx-card';
import { OverviewDashboard } from '../../src/features/overview/overview-dashboard';
import { useShanghaiDate } from '../../src/features/cards/use-shanghai-date';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('../../src/demo/demo-context', () => ({ useDemo: () => ({ snapshot: createSeedSnapshot('v1') }), useOptionalDemo: () => null }));
vi.mock('../../src/features/fx/use-rate-history', () => ({ useRateHistory: () => [] }));
vi.mock('../../src/features/cards/use-shanghai-date', () => ({ useShanghaiDate: vi.fn() }));
const model = (snapshot: FinancialSnapshot) => getOverviewModel({ getSnapshot: async () => snapshot } as unknown as FinancialRepository, DEMO_USER_ID);
beforeEach(() => vi.mocked(useShanghaiDate).mockReturnValue('2026-10-21'));

it('keeps unpaid tuition after its due date and updates the label as the Shanghai day changes', async () => {
  const overview = await model(createSeedSnapshot('v1'));
  const view = render(<TuitionFxCard overview={overview} />);
  expect(screen.getByRole('heading', { name: 'Upcoming tuition' })).toBeInTheDocument();
  vi.mocked(useShanghaiDate).mockReturnValue('2026-11-01');
  view.rerender(<TuitionFxCard overview={overview} />);
  expect(screen.queryByRole('heading', { name: 'Overdue tuition' })).not.toBeInTheDocument();
  vi.mocked(useShanghaiDate).mockReturnValue('2026-11-02');
  view.rerender(<TuitionFxCard overview={overview} />);
  expect(screen.getByRole('heading', { name: 'Overdue tuition' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('payment still outstanding');
  expect(screen.getByText('CNY 5,000.00')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Plan payment' })).toBeInTheDocument();
});

it('removes paid tuition from Overview, including its custom card, while retaining the obligation in history', async () => {
  const seed = createSeedSnapshot('v1');
  const paid = { ...seed, tuitionObligations: seed.tuitionObligations.map(t => ({ ...t, status: 'paid' as const, paidAmount: t.amount })) };
  const before = await model(seed);
  const after = await model(paid);
  const view = render(<OverviewDashboard overview={before} tuition={<TuitionFxCard overview={before} />} />);
  expect(screen.getByRole('heading', { name: 'Upcoming tuition' })).toBeInTheDocument();
  view.rerender(<OverviewDashboard overview={after} tuition={<TuitionFxCard overview={after} />} />);
  expect(screen.queryByRole('heading', { name: /tuition/i })).not.toBeInTheDocument();
  expect(paid.tuitionObligations).toHaveLength(1);
  expect(after.availableCash).toEqual(before.availableCash);
  expect(after.totalNetWorth).toEqual(before.totalNetWorth);
});

it('retains partially paid overdue tuition and displays only the outstanding amount', async () => {
  const seed = createSeedSnapshot('v1');
  const partial = { ...seed, tuitionObligations: seed.tuitionObligations.map(t => ({ ...t, status: 'partially-paid' as const, paidAmount: { ...t.amount, amountMinor: 200000n } })) };
  vi.mocked(useShanghaiDate).mockReturnValue('2026-11-02');
  render(<TuitionFxCard overview={await model(partial)} />);
  expect(screen.getByRole('heading', { name: 'Overdue tuition' })).toBeInTheDocument();
  expect(screen.getByText('CNY 3,000.00')).toBeInTheDocument();
});
