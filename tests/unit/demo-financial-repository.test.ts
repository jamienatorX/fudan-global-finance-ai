import { describe, expect, it } from 'vitest';
import { DemoFinancialRepository } from '../../src/demo/demo-financial-repository';
import { createSeedSnapshot } from '../../src/demo/seed';
import type { FinancialRepository } from '../../src/domain/financial-repository';

const userId = '00000000-0000-4000-8000-000000000001';

describe('demo repository boundary', () => {
  it('implements asynchronous user-scoped reads for every focused collection', async () => {
    const repository: FinancialRepository = new DemoFinancialRepository('v1');
    const seed = createSeedSnapshot('v1');
    expect(await repository.getSnapshot(userId)).toEqual(seed);
    expect(await repository.getUser(userId)).toEqual(seed.users[0]);
    expect(await repository.listAccounts(userId)).toEqual(seed.accounts);
    expect(await repository.listTransactions(userId)).toEqual(seed.transactions);
    expect(await repository.listBudgets(userId)).toEqual(seed.budgets);
    expect(await repository.listBeneficiaries(userId)).toEqual(seed.beneficiaries);
    expect(await repository.listCards(userId)).toEqual(seed.cards);
    expect(await repository.listSubscriptions(userId)).toEqual(seed.subscriptions);
    expect(await repository.listInvestmentProducts(userId)).toEqual(seed.investmentProducts);
    expect(await repository.listHoldings(userId)).toEqual(seed.holdings);
    expect(await repository.listTuitionObligations(userId)).toEqual(seed.tuitionObligations);
    expect(await repository.listExchangeRates(userId)).toEqual(seed.exchangeRates);
  });

  it('isolates stored arrays, nested money, and profile objects from caller mutation', async () => {
    const repository = new DemoFinancialRepository('v1');
    const read = await repository.getSnapshot(userId);
    // Deliberately bypass readonly types to exercise the runtime ownership boundary.
    (read.accounts as unknown as unknown[]).pop();
    (read.accounts[0].balance as { amountMinor: bigint }).amountMinor = 1n;
    (read.users[0].profile as { city: string }).city = 'Changed';
    const accounts = await repository.listAccounts(userId);
    (accounts[0].availableBalance as { amountMinor: bigint }).amountMinor = 2n;
    const user = await repository.getUser(userId);
    (user.profile as { city: string }).city = 'Changed again';
    expect(await repository.getSnapshot(userId)).toEqual(createSeedSnapshot('v1'));
  });

  it('replaces the snapshot on repeated reset without duplicate records or changing IDs', async () => {
    const repository = new DemoFinancialRepository('v1');
    const first = await repository.reset(userId);
    const second = await repository.reset(userId);
    expect(second).toEqual(first);
    expect(second.accounts).toHaveLength(5);
    expect(second.budgets).toHaveLength(5);
    expect(second.subscriptions).toHaveLength(4);
    (second.accounts[0].balance as { amountMinor: bigint }).amountMinor = 0n;
    expect(await repository.getSnapshot(userId)).toEqual(createSeedSnapshot('v1'));
  });

  it('rejects reads and reset outside the demo owner without changing stored data', async () => {
    const repository = new DemoFinancialRepository('v1');
    await expect(repository.getSnapshot('someone-else')).rejects.toThrow(/demo user/i);
    await expect(repository.listAccounts('someone-else')).rejects.toThrow(/demo user/i);
    await expect(repository.reset('someone-else')).rejects.toThrow(/demo user/i);
    expect(await repository.getSnapshot(userId)).toEqual(createSeedSnapshot('v1'));
  });
});
