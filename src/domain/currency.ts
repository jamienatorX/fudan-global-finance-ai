export const CURRENCY_MINOR_DIGITS = {
  CNY: 2,
  IDR: 0,
  USD: 2,
  SGD: 2,
} as const;

export type CurrencyCode = keyof typeof CURRENCY_MINOR_DIGITS;

export function assertCurrencyCode(value: unknown): asserts value is CurrencyCode {
  if (typeof value !== 'string' || !Object.hasOwn(CURRENCY_MINOR_DIGITS, value)) {
    throw new TypeError(`Unsupported currency: ${String(value)}`);
  }
}
