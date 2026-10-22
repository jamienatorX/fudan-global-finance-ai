import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { DemoProvider } from '../../src/demo/demo-context';
import { ApprovalDrawer } from '../../src/features/demo/approval-drawer';
import { InvestingPreferencesProvider } from '../../src/features/investing/investing-preferences';
import { InvestingWorkspace } from '../../src/features/investing/investing-workspace';
import { CardReminders } from '../../src/features/cards/card-reminders';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
beforeEach(() => localStorage.clear());
const mount = () => render(<DemoProvider><InvestingPreferencesProvider><InvestingWorkspace /><ApprovalDrawer /></InvestingPreferencesProvider></DemoProvider>);

it('requires acknowledgment and confirmation, and cancelled orders leave holdings unchanged', async () => {
  mount();
  const buy = screen.getByRole('button', { name: 'Review simulated buy' });
  expect(buy).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(buy);
  const review = screen.getByRole('region', { name: 'Review and confirmation' });
  expect(review).toHaveTextContent('CNY 1,560.00');
  fireEvent.click(within(review).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByText('Apple (simulation)')).not.toBeInTheDocument();
  fireEvent.click(buy);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Simulated buy: 1 AAPL'));
  fireEvent.click(screen.getByRole('button', { name: 'Portfolio' }));
  expect(screen.getAllByText('Apple (simulation)').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Review sale' })).toBeInTheDocument();
});
it('searches assets and persists watchlist changes across remounts', async () => {
  const view = mount();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search investments' }), { target: { value: 'Ethereum' } });
  fireEvent.click(screen.getByRole('button', { name: 'Watch ETH' }));
  await waitFor(() => expect(localStorage.getItem('fu-bank:investing-preferences:v1')).toContain('eth'));
  view.unmount(); mount();
  fireEvent.click(screen.getByRole('button', { name: 'Watchlist' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Remove ETH' })).toBeInTheDocument());
});
it('saves, edits and marks card reminders paid without claiming a payment', async () => {
  const view = render(<InvestingPreferencesProvider><CardReminders /></InvestingPreferencesProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Add reminder' }));
  fireEvent.change(screen.getByLabelText('Card nickname'), { target: { value: 'Student card' } });
  fireEvent.change(screen.getByLabelText('Last four digits'), { target: { value: '1234' } });
  fireEvent.change(screen.getByLabelText('Statement amount (CNY)'), { target: { value: '500' } });
  fireEvent.change(screen.getByLabelText('Due date (Shanghai)'), { target: { value: '2026-11-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save reminder' }));
  await waitFor(() => expect(localStorage.getItem('fu-bank:investing-preferences:v1')).toContain('Student card'));
  view.unmount();
  render(<InvestingPreferencesProvider><CardReminders /></InvestingPreferencesProvider>);
  await waitFor(() => expect(screen.getByText('Student card · ••1234')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  fireEvent.change(screen.getByLabelText('Statement amount (CNY)'), { target: { value: '600' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save reminder' }));
  expect(screen.getByText(/CNY 600.00/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mark paid Student card' }));
  expect(screen.getByRole('status')).toHaveTextContent('福 Bank has not made a payment');
  expect(screen.getByText('Paid', { exact: true })).toBeInTheDocument();
});
