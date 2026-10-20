import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../src/demo/seed';
import { getOverviewModel } from '../../src/features/overview/overview-queries';
import { getMembership } from '../../src/features/overview/membership';
import { MembershipBadge, MembershipProgress } from '../../src/features/overview/membership-progress';
import { DashboardBankCard } from '../../src/features/overview/dashboard-bank-card';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

it('shows habit membership in Planner and the actual masked virtual card', async () => {
  const model = await getOverviewModel(new DemoFinancialRepository(), DEMO_USER_ID);
  render(<><MembershipBadge habits={model.membershipHabits}/><MembershipProgress habits={model.membershipHabits}/><DashboardBankCard cards={model.cards} cardholderName={model.cardholderName} tier={getMembership(model.membershipHabits).current}/></>);
  expect(screen.getByText(getMembership(model.membershipHabits).current.name + ' member')).toBeInTheDocument();
  const membership = screen.getByRole('group', { name: 'Membership progress' });
  expect(membership).toHaveTextContent('months within budget');
  expect(membership).toHaveTextContent('month savings streak');
  expect(membership).toHaveTextContent('emergency fund goal');
  expect(membership).not.toHaveTextContent('portfolio value');
  const steps = within(membership).getByRole('list', { name: 'Membership tiers' });
  for (const name of ['Bronze', 'Silver', 'Gold', 'Platinum', 'VIP']) expect(within(steps).getByText(name)).toBeInTheDocument();
  const card = screen.getByRole('region', { name: 'Your virtual bank card' });
  expect(card).toHaveTextContent(model.cards[0].maskedNumber);
  expect(card).toHaveTextContent(model.cardholderName);
  fireEvent.click(within(card).getByRole('button', { name: /View online shopping card ending/i }));
  const expanded = screen.getByRole('dialog', { name: 'Online shopping virtual card' });
  expect(expanded).toHaveTextContent(model.cards[1].maskedNumber);
  expect(card).toHaveTextContent(model.cards[1].maskedNumber);
  expect(within(card).getByRole('link', { name: 'Manage cards' })).toHaveAttribute('href', '/cards');
});
