import { assertCurrencyCode, CURRENCY_MINOR_DIGITS, type CurrencyCode } from './currency';

export type Money = Readonly<{ amountMinor: bigint; currency: CurrencyCode }>;
export type MoneyDTO = Readonly<{ amountMinor: string; currency: CurrencyCode }>;

function parseMinorUnits(value: bigint | string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) {
    throw new TypeError('Minor units must be a bigint or a base-10 integer string');
  }
  return BigInt(value);
}

export function money(amountMinor: bigint | string, currency: CurrencyCode): Money {
  assertCurrencyCode(currency);
  return { amountMinor: parseMinorUnits(amountMinor), currency };
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new TypeError(`Currency mismatch: ${left.currency} and ${right.currency}`);
  }
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.amountMinor + right.amountMinor, left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.amountMinor - right.amountMinor, left.currency);
}

export function compareMoney(left: Money, right: Money): -1 | 0 | 1 {
  assertSameCurrency(left, right);
  if (left.amountMinor < right.amountMinor) return -1;
  if (left.amountMinor > right.amountMinor) return 1;
  return 0;
}

export function multiplyMoneyByBasisPoints(value: Money, basisPoints: number): Money {
  if (!Number.isSafeInteger(basisPoints)) {
    throw new TypeError('Basis points must be a safe integer');
  }
  const numerator = value.amountMinor * BigInt(basisPoints);
  const magnitude = numerator < 0n ? -numerator : numerator;
  const rounded = (magnitude + 5000n) / 10000n;
  return money(numerator < 0n ? -rounded : rounded, value.currency);
}

export function formatMoney(value: Money, locale = 'en-US'): string {
  const digits = CURRENCY_MINOR_DIGITS[value.currency];
  const divisor = 10n ** BigInt(digits);
  const major = value.amountMinor / divisor;
  const remainder = value.amountMinor % divisor;
  const fraction = remainder < 0n ? -remainder : remainder;
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    currencyDisplay: 'code',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  // Negative zero preserves the sign for amounts such as CNY -0.01.
  const signedMajor = major === 0n && value.amountMinor < 0n ? -0 : major;
  const localizedFraction = new Intl.NumberFormat(locale, {
    useGrouping: false,
    minimumIntegerDigits: Math.max(digits, 1),
    maximumFractionDigits: 0,
  }).format(fraction);

  return formatter.formatToParts(signedMajor)
    .map((part) => part.type === 'fraction' ? localizedFraction : part.value)
    .join('');
}

export function toMoneyDTO(value: Money): MoneyDTO {
  return { amountMinor: value.amountMinor.toString(10), currency: value.currency };
}

export function fromMoneyDTO(dto: MoneyDTO): Money {
  if (typeof dto.amountMinor !== 'string') {
    throw new TypeError('DTO minor units must be a base-10 integer string');
  }
  return money(dto.amountMinor, dto.currency);
}
