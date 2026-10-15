import type { FinancialSnapshot } from '../domain/entities';
import type { FinancialRepository } from '../domain/financial-repository';
import { fromFinancialSnapshotDTO, toFinancialSnapshotDTO } from '../domain/financial-snapshot-dto';
import { createSeedSnapshot, DEFAULT_SEED_VERSION, DEMO_USER_ID } from './seed';

/** In-memory, single-owner demo adapter; never accesses or mutates external services. */
export class DemoFinancialRepository implements FinancialRepository {
  private snapshot: FinancialSnapshot;

  constructor(private readonly seedVersion = DEFAULT_SEED_VERSION) {
    this.snapshot = createSeedSnapshot(seedVersion);
  }

  private assertDemoUser(userId: string): void {
    if (userId !== DEMO_USER_ID) throw new Error('Only the demo user can access this repository');
  }

  async getSnapshot(userId: string): Promise<FinancialSnapshot> {
    this.assertDemoUser(userId);
    return fromFinancialSnapshotDTO(toFinancialSnapshotDTO(this.snapshot));
  }

  async getUser(userId: string) { return (await this.getSnapshot(userId)).users[0]; }
  async listAccounts(userId: string) { return (await this.getSnapshot(userId)).accounts; }
  async listTransactions(userId: string) { return (await this.getSnapshot(userId)).transactions; }
  async listBudgets(userId: string) { return (await this.getSnapshot(userId)).budgets; }
  async listBeneficiaries(userId: string) { return (await this.getSnapshot(userId)).beneficiaries; }
  async listCards(userId: string) { return (await this.getSnapshot(userId)).cards; }
  async listSubscriptions(userId: string) { return (await this.getSnapshot(userId)).subscriptions; }
  async listInvestmentProducts(userId: string) { return (await this.getSnapshot(userId)).investmentProducts; }
  async listHoldings(userId: string) { return (await this.getSnapshot(userId)).holdings; }
  async listTuitionObligations(userId: string) { return (await this.getSnapshot(userId)).tuitionObligations; }
  async listExchangeRates(userId: string) { return (await this.getSnapshot(userId)).exchangeRates; }

  async reset(userId: string): Promise<FinancialSnapshot> {
    this.assertDemoUser(userId);
    // Replace the complete owned snapshot in one assignment, never append seed rows.
    this.snapshot = createSeedSnapshot(this.seedVersion);
    return this.getSnapshot(userId);
  }
}
