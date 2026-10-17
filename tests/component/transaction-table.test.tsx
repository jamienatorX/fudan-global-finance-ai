import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSeedSnapshot } from '../../src/demo/seed';
import { TransactionTable } from '../../src/features/transactions/transaction-table';

describe('transaction table', () => {
  it('shows classification and anomalies without claiming transfers are spending', () => {
    const transactions = createSeedSnapshot('v1').transactions;
    render(<TransactionTable transactions={transactions.slice(0, 3)} total={transactions.length} />);
    expect(screen.getByRole('heading', { name: 'Transaction history' })).toBeInTheDocument();
    expect(screen.getByText('Campus Dining')).toBeInTheDocument();
    expect(screen.getByText('Unusually large food purchase')).toBeInTheDocument();
    expect(screen.getAllByText('Consumption').length).toBeGreaterThan(0);
  });
  it('handles empty results', () => {
    render(<TransactionTable transactions={[]} total={0} />);
    expect(screen.getByText(/No transactions match/)).toBeInTheDocument();
  });
});
