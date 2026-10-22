import type { CurrencyCode } from '../../domain/currency';
import type { Transaction } from '../../domain/entities';
import type { FinancialRepository } from '../../domain/financial-repository';

export type TransactionSearch = Readonly<{
  accountId?: string;
  currency?: CurrencyCode;
  search?: string;
  month?: string;
  classification?: Transaction['classification'];
  page?: number;
  pageSize?: number;
}>;

export type TransactionSearchResult = Readonly<{
  transactions: readonly Transaction[];
  total: number;
  page: number;
  pageSize: number;
}>;

/** All rows remain scoped to the signed-in owner and their account IDs. */
export async function searchTransactions(
  repository: FinancialRepository,
  userId: string,
  filters: TransactionSearch = {},
): Promise<TransactionSearchResult> {
  const accounts = await repository.listAccounts(userId);
  const owned = new Set(accounts.filter((account) => account.ownerId === userId).map((account) => account.id));
  if (filters.accountId && !owned.has(filters.accountId)) throw new Error('Account not found');
  if (filters.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month)) throw new TypeError('Invalid month');
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new RangeError('Invalid pagination');
  }
  const needle = filters.search?.trim().toLocaleLowerCase() ?? '';
  const matching = (await repository.listTransactions(userId))
    .filter((row) => row.ownerId === userId && owned.has(row.accountId))
    .filter((row) => !filters.accountId || row.accountId === filters.accountId)
    .filter((row) => !filters.currency || row.amount.currency === filters.currency)
    .filter((row) => !filters.month || row.occurredAt.startsWith(filters.month + '-'))
    .filter((row) => !filters.classification || row.classification === filters.classification)
    .filter((row) => !needle || row.merchant.toLocaleLowerCase().includes(needle) || row.category.includes(needle))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id));
  return {
    transactions: matching.slice((page - 1) * pageSize, page * pageSize),
    total: matching.length,
    page,
    pageSize,
  };
}
