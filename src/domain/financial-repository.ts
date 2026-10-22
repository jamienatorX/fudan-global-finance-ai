import type {
  Account, Beneficiary, Budget, Card, ExchangeRate, FinancialSnapshot, Holding,
  InvestmentProduct, Subscription, Transaction, TuitionObligation, User,
} from './entities';

/** User-scoped asynchronous port shared by the demo and future persistent adapters. */
export interface FinancialRepository {
  getSnapshot(userId: string): Promise<FinancialSnapshot>;
  getUser(userId: string): Promise<User>;
  listAccounts(userId: string): Promise<readonly Account[]>;
  listTransactions(userId: string): Promise<readonly Transaction[]>;
  listBudgets(userId: string): Promise<readonly Budget[]>;
  listBeneficiaries(userId: string): Promise<readonly Beneficiary[]>;
  listCards(userId: string): Promise<readonly Card[]>;
  listSubscriptions(userId: string): Promise<readonly Subscription[]>;
  listInvestmentProducts(userId: string): Promise<readonly InvestmentProduct[]>;
  listHoldings(userId: string): Promise<readonly Holding[]>;
  listTuitionObligations(userId: string): Promise<readonly TuitionObligation[]>;
  listExchangeRates(userId: string): Promise<readonly ExchangeRate[]>;
  reset(userId: string): Promise<FinancialSnapshot>;
}
