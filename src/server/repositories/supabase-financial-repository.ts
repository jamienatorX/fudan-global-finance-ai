import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialRepository } from '../../domain/financial-repository';
import { snapshotFromRows } from './financial-row-mapping';

type RequestClient = Readonly<{
  auth: { getClaims(): Promise<{ data: { claims: { sub?: string } } | null; error: unknown }> };
  rpc: SupabaseClient['rpc'];
}>;

/** Inject only the current request's publishable-key client; RLS remains authoritative. */
export class SupabaseFinancialRepository implements FinancialRepository {
  constructor(private readonly client: RequestClient) {}

  private async authorize(userId: string) {
    const { data, error } = await this.client.auth.getClaims();
    if (error || !data?.claims.sub || data.claims.sub !== userId) throw new Error('Not authorized');
  }

  async getSnapshot(userId: string) {
    await this.authorize(userId);
    const { data, error } = await this.client.rpc('read_financial_snapshot');
    if (error) throw new Error(error.message);
    return snapshotFromRows(data, userId);
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

  async reset(userId: string) {
    await this.authorize(userId);
    const { data, error } = await this.client.rpc('reset_demo_data');
    if (error) throw new Error(error.message);
    return snapshotFromRows(data, userId);
  }
}
