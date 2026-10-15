import type { FinancialSnapshot } from './entities';
import { fromMoneyDTO, toMoneyDTO, type Money, type MoneyDTO } from './money';

export type FinancialDTO<T> = T extends Money ? MoneyDTO
  : T extends readonly (infer Item)[] ? readonly FinancialDTO<Item>[]
  : T extends object ? { readonly [Key in keyof T]: FinancialDTO<T[Key]> } : T;
export type FinancialSnapshotDTO = FinancialDTO<FinancialSnapshot>;

const jsonFields = new Set([
  'metadata', 'contextSnapshot', 'calculations', 'input', 'expectedImpact',
  'validationResult', 'executionResult', 'beforeSummary', 'afterSummary',
]);

// Snapshots consist only of plain records, arrays, primitives, and Money values.
// Conversion occurs at the explicit transport boundary, never via Number(bigint).
function convert(value: unknown, direction: 'encode' | 'decode', convertMoney = true): unknown {
  if (Array.isArray(value)) return value.map((item) => convert(item, direction, convertMoney));
  if (value !== null && typeof value === 'object') {
    if (convertMoney && 'amountMinor' in value && 'currency' in value) {
      return direction === 'encode' ? toMoneyDTO(value as Money) : fromMoneyDTO(value as MoneyDTO);
    }
    // JSON metadata has its own contract: even money-shaped JSON remains JSON.
    return Object.fromEntries(Object.entries(value).map(([key, item]) =>
      [key, convert(item, direction, convertMoney && !jsonFields.has(key))]));
  }
  return value;
}

/** Only accepts a typed domain snapshot; not a validation API for arbitrary JSON. */
export function toFinancialSnapshotDTO(snapshot: FinancialSnapshot): FinancialSnapshotDTO {
  return convert(snapshot, 'encode') as FinancialSnapshotDTO;
}

/** The caller validates the snapshot shape; individual Money DTOs validate integer strings/currencies. */
export function fromFinancialSnapshotDTO(snapshot: FinancialSnapshotDTO): FinancialSnapshot {
  return convert(snapshot, 'decode') as FinancialSnapshot;
}
