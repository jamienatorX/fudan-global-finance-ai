import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSeedSnapshot } from '../../src/demo/seed';
import { AccountList } from '../../src/features/accounts/account-list';
import { money } from '../../src/domain/money';

describe('account list', () => {
  it('shows original currency balances and links to each account ledger', () => {
    const accounts = createSeedSnapshot('v1').accounts;
    render(<AccountList accounts={accounts} reportingBalances={[{ id: accounts[0].id, reportingAmount: money(1_865_000n, 'CNY') }]} />);
    expect(screen.getByText('CNY 18,650.00')).toBeInTheDocument();
    expect(screen.getByText('IDR 2,500,000')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View transactions' })).toHaveLength(5);
  });
});
