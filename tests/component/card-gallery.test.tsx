import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { DemoProvider, useDemo } from '../../src/demo/demo-context';
import { DashboardBankCard } from '../../src/features/overview/dashboard-bank-card';
import { ApprovalDrawer } from '../../src/features/demo/approval-drawer';
import { MEMBERSHIP_TIERS } from '../../src/features/overview/membership';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
beforeEach(() => localStorage.clear());
function Gallery() {
  const { snapshot } = useDemo();
  return <><DashboardBankCard cards={snapshot.cards} cardholderName={snapshot.users[0].profile.displayName} tier={MEMBERSHIP_TIERS[2]} /><ApprovalDrawer /></>;
}
it('expands a compact card and returns focus when closed with Escape', () => {
  render(<DemoProvider><Gallery /></DemoProvider>);
  const thumbnail = screen.getByRole('button', { name: /View daily spending card ending/i });
  thumbnail.focus(); fireEvent.click(thumbnail);
  const dialog = screen.getByRole('dialog', { name: 'Daily spending virtual card' });
  expect(dialog).toHaveTextContent('Jim Pratama');
  expect(within(dialog).getByRole('button', { name: 'Review freeze' })).toBeInTheDocument();
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(thumbnail).toHaveFocus();
});
it('adds a new virtual card only after confirmation', () => {
  render(<DemoProvider><Gallery /></DemoProvider>);
  expect(screen.getAllByRole('button', { name: /View .* card ending/ })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Add virtual card' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review new card' }));
  expect(screen.getAllByRole('button', { name: /View .* card ending/ })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(screen.getAllByRole('button', { name: /View .* card ending/ })).toHaveLength(3);
});
