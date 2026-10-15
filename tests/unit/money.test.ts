import { describe, expect, it } from 'vitest';
import type { CurrencyCode } from '../../src/domain/currency';
import {
  addMoney,
  compareMoney,
  formatMoney,
  fromMoneyDTO,
  money,
  multiplyMoneyByBasisPoints,
  subtractMoney,
  toMoneyDTO,
  type MoneyDTO,
} from '../../src/domain/money';

describe('money arithmetic', () => {
  it('reduces CNY 580 to CNY 464 at 80 percent', () => {
    expect(multiplyMoneyByBasisPoints(money(58000n, 'CNY'), 8000)).toEqual({
      amountMinor: 46400n,
      currency: 'CNY',
    });
  });

  it('calculates CNY 116 savings from CNY 580 minus CNY 464', () => {
    expect(subtractMoney(money(58000n, 'CNY'), money(46400n, 'CNY'))).toEqual({
      amountMinor: 11600n,
      currency: 'CNY',
    });
  });

  it('adds amounts above the safe integer range without losing minor units', () => {
    expect(addMoney(money('9007199254740993', 'USD'), money(2n, 'USD'))).toEqual({
      amountMinor: 9007199254740995n,
      currency: 'USD',
    });
  });

  it.each([
    [100n, 200n, -1],
    [200n, 200n, 0],
    [300n, 200n, 1],
    [-300n, -200n, -1],
  ] as const)('compares %s minor units with %s as %s', (left, right, want) => {
    expect(compareMoney(money(left, 'SGD'), money(right, 'SGD'))).toBe(want);
  });

  it.each([addMoney, subtractMoney, compareMoney])(
    '%s rejects mixing currencies',
    (operation) => {
      expect(() => operation(money(100n, 'CNY'), money(100n, 'USD'))).toThrow(
        /currency/i,
      );
    },
  );

  it.each([
    [1n, 5000, 1n],
    [-1n, 5000, -1n],
    [1n, -5000, -1n],
    [-1n, -5000, 1n],
    [1n, 4999, 0n],
    [-1n, 4999, 0n],
    [3n, 5000, 2n],
    [-3n, 5000, -2n],
    [58000n, 0, 0n],
    [9007199254740993n, 10000, 9007199254740993n],
  ] as const)(
    'rounds %s minor units at %s basis points to %s, half away from zero',
    (amount, basisPoints, want) => {
      expect(multiplyMoneyByBasisPoints(money(amount, 'CNY'), basisPoints).amountMinor)
        .toBe(want);
    },
  );

  it.each([0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an inexact basis-point rate of %s',
    (basisPoints) => {
      expect(() => multiplyMoneyByBasisPoints(money(100n, 'CNY'), basisPoints))
        .toThrow(/basis points/i);
    },
  );
});

describe('money formatting', () => {
  it('formats IDR with zero decimal places', () => {
    expect(formatMoney(money(1234567n, 'IDR'))).toBe('IDR\u00a01,234,567');
  });

  it.each(['CNY', 'USD', 'SGD'] as const)(
    'formats %s with two minor digits',
    (currency) => {
      expect(formatMoney(money(58001n, currency))).toBe(`${currency}\u00a0580.01`);
    },
  );

  it('preserves fractional digits above the safe integer range', () => {
    expect(formatMoney(money(900719925474099312345n, 'USD')))
      .toBe('USD\u00a09,007,199,254,740,993,123.45');
  });

  it('preserves the sign of a negative amount below one major unit', () => {
    expect(formatMoney(money(-1n, 'CNY'))).toBe('-CNY\u00a00.01');
  });

  it('uses the requested locale for grouping and decimals', () => {
    expect(formatMoney(money(123456n, 'CNY'), 'de-DE'))
      .toBe('1.234,56\u00a0CNY');
  });
});

describe('money serialization boundaries', () => {
  it('round-trips a value above Number.MAX_SAFE_INTEGER through JSON as decimal strings', () => {
    const dto = toMoneyDTO(money(9007199254740993n, 'CNY'));
    expect(dto).toEqual({ amountMinor: '9007199254740993', currency: 'CNY' });
    expect(JSON.stringify(dto)).toBe('{"amountMinor":"9007199254740993","currency":"CNY"}');
    expect(fromMoneyDTO(JSON.parse(JSON.stringify(dto)))).toEqual({
      amountMinor: 9007199254740993n,
      currency: 'CNY',
    });
  });

  it('reconstructs signed base-10 minor units', () => {
    expect(fromMoneyDTO({ amountMinor: '-11600', currency: 'CNY' })).toEqual({
      amountMinor: -11600n,
      currency: 'CNY',
    });
  });

  it.each(['1.2', '1e3', '0x10', '', ' 1', 9007199254740992])(
    'rejects invalid decimal minor units %s',
    (amountMinor) => {
      expect(() => fromMoneyDTO({ amountMinor, currency: 'USD' } as MoneyDTO))
        .toThrow(/minor units/i);
    },
  );

  it('rejects unsupported currencies at the input boundary', () => {
    expect(() => money(100n, 'EUR' as CurrencyCode)).toThrow(/currency/i);
    expect(() => fromMoneyDTO({ amountMinor: '100', currency: 'EUR' as CurrencyCode }))
      .toThrow(/currency/i);
  });
});
