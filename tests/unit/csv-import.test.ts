import { describe, expect, it } from 'vitest';
import { parseTransactionCsv, safeCsvCell, MAX_CSV_ROWS } from '../../src/features/transactions/csv-import';

describe('read-only CSV import preview', () => {
  it('handles quoted commas, BOM, CRLF, signed money, and zero-decimal IDR without floating-point conversion', () => {
    const preview = parseTransactionCsv('\uFEFFdate,merchant,amount,currency\r\n2026-10-12,"Coffee, Campus",-25.50,CNY\r\n2026-10-13,Allowance,+100000,IDR\r\n');
    expect(preview.errors).toEqual([]);
    expect(preview.validRows).toEqual([
      { line: 2, date: '2026-10-12', merchant: 'Coffee, Campus', direction: 'debit', amountMinor: '2550', currency: 'CNY' },
      { line: 3, date: '2026-10-13', merchant: 'Allowance', direction: 'credit', amountMinor: '100000', currency: 'IDR' },
    ]);
  });

  it('isolates invalid dates, malformed amounts, currency precision, and zero amounts', () => {
    const preview = parseTransactionCsv([
      'date,merchant,amount,currency',
      '2026-02-30,Wrong date,-10,CNY',
      '2026-10-13,Wrong amount,abc,CNY',
      '2026-10-13,Too precise,-5.125,CNY',
      '2026-10-13,Zero,0,CNY',
      '2026-10-14,Valid,-1.05,SGD',
    ].join('\n'));
    expect(preview.validRows).toHaveLength(1);
    expect(preview.errors.map((error) => error.line)).toEqual([2, 3, 4, 5]);
    expect(preview.totalRows).toBe(5);
  });

  it('rejects broken columns, duplicate headers, oversized files and row limits', () => {
    expect(() => parseTransactionCsv('date,merchant,amount,currency\n2026-10-01,"bad quote,-1,CNY')).toThrow();
    expect(() => parseTransactionCsv('date,date,amount,currency\n2026-10-01,a,-1,CNY')).toThrow();
    expect(() => parseTransactionCsv('x'.repeat(1_000_001))).toThrow();
    expect(() => parseTransactionCsv('date,merchant,amount,currency\n' + '2026-10-01,A,-1,CNY\n'.repeat(MAX_CSV_ROWS + 1))).toThrow();
  });

  it('neutralizes spreadsheet formula injection for any future CSV export', () => {
    expect(safeCsvCell('=1+2')).toBe('"\'=1+2"');
    expect(safeCsvCell('  @HYPERLINK')).toBe('"\'  @HYPERLINK"');
    expect(safeCsvCell('normal "quote"')).toBe('"normal ""quote"""');
  });
});
