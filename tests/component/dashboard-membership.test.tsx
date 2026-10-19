import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../src/demo/seed';
import { getOverviewModel } from '../../src/features/overview/overview-queries';
import { OverviewDashboard } from '../../src/features/overview/overview-dashboard';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

it('shows the current tier, all thresholds, and the actual masked virtual card', async () => {
  const model = await getOverviewModel(new DemoFinancialRepository(), DEMO_USER_ID);
  render(<OverviewDashboard overview={model} />);
  expect(screen.getByText('Gold member')).toBeInTheDocument();
  const membership = screen.getByRole('group', { name: 'Membership progress' });
  const steps = within(membership).getByRole('list', { name: 'Membership tiers' });
  for (const name of ['Bronze', 'Silver', 'Gold', 'Platinum', 'VIP']) expect(within(steps).getByText(name)).toBeInTheDocument();
  const card = screen.getByRole('region', { name: 'Your virtual bank card' });
  expect(card).toHaveTextContent(model.cards[0].maskedNumber);
  expect(card).toHaveTextContent(model.cardholderName);
  fireEvent.change(within(card).getByRole('combobox', { name: 'Choose virtual card' }), { target: { value: model.cards[1].id } });
  expect(card).toHaveTextContent(model.cards[1].maskedNumber);
  expect(within(card).getByRole('link', { name: 'Manage cards' })).toHaveAttribute('href', '/cards');
});
