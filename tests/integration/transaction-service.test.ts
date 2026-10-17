import { describe, expect, it } from 'vitest';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { DEMO_USER_ID } from '../../src/demo/seed';
import { searchTransactions } from '../../src/features/transactions/transaction-service';

describe('transaction search', () => {
  it('filters merchant, month, currency and account while retaining explicit transfer classifications', async () => {
    const repo = new DemoFinancialRepository();
    const accounts = await repo.listAccounts(DEMO_USER_ID);
    const result = await searchTransactions(repo, DEMO_USER_ID,
      { accountId: accounts.find((account) => account.currency === 'CNY' && account.type === 'daily')!.id,
        month: '2026-10', currency: 'CNY', search: 'savings' });
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].classification).toBe('internal-transfer');
    expect(result.total).toBe(1);
  });

  it('never grants access to a foreign account ID and rejects excessive page sizes', async () => {
    const repo = new DemoFinancialRepository();
    await expect(searchTransactions(repo, DEMO_USER_ID, { accountId: 'someone-elses-account' })).rejects.toThrow('Account not found');
    await expect(searchTransactions(repo, DEMO_USER_ID, { pageSize: 9999 })).rejects.toThrow('Invalid pagination');
  });
});
