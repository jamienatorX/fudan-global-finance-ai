import { CURRENCY_MINOR_DIGITS, type CurrencyCode } from '../../domain/currency';

export const MAX_CSV_BYTES = 1_000_000;
export const MAX_CSV_ROWS = 1_000;
export type ImportPreviewRow = Readonly<{
  line: number;
  date: string;
  merchant: string;
  direction: 'credit' | 'debit';
  amountMinor: string;
  currency: CurrencyCode;
}>;
export type ImportRowError = Readonly<{ line: number; message: string }>;
export type ImportPreview = Readonly<{
  validRows: readonly ImportPreviewRow[];
  errors: readonly ImportRowError[];
  totalRows: number;
}>;

/** For any future CSV export. Neutralize spreadsheet formulas, even after leading whitespace. */
export function safeCsvCell(value: string): string {
  const protectedValue = /^[\s]*[=+\-@]/.test(value) || /^[\t\r]/.test(value) ? "'" + value : value;
  return '"' + protectedValue.replaceAll('"', '""') + '"';
}

/** RFC 4180-style quoted fields; malformed quoting rejects the file, not silently shifted columns. */
export function readCsvRecords(text: string, maxRecords = MAX_CSV_ROWS + 1): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let closed = false;
  let started = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else { field += char; }
      continue;
    }
    if (char === '"') {
      if (field.length || closed) throw new TypeError('Malformed CSV quotation');
      quoted = true; started = true;
    } else if (char === ',') {
      row.push(field); field = ''; closed = false; started = true;
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      if (started || field || row.length) { row.push(field); records.push(row); }
      row = []; field = ''; closed = false; started = false;
      if (records.length > maxRecords) throw new RangeError('CSV row limit exceeded');
    } else {
      if (closed) throw new TypeError('Unexpected characters after CSV quote');
      field += char; started = true;
    }
  }
  if (quoted) throw new TypeError('Unclosed CSV quotation');
  if (started || field || row.length) { row.push(field); records.push(row); }
  if (records.length > maxRecords) throw new RangeError('CSV row limit exceeded');
  return records;
}

function minorAmount(value: string, currency: CurrencyCode): Readonly<{ direction: 'credit' | 'debit'; amountMinor: string }> {
  const trimmed = value.trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) throw new TypeError('Invalid decimal amount');
  const negative = trimmed.startsWith('-');
  const positiveText = trimmed.replace(/^[+-]/, '');
  const [whole, fraction = ''] = positiveText.split('.');
  const digits = CURRENCY_MINOR_DIGITS[currency];
  if (fraction.length > digits) throw new TypeError('Too many decimal places for currency');
  const amount = BigInt(whole) * 10n ** BigInt(digits) + BigInt((fraction.padEnd(digits, '0')) || '0');
  if (amount <= 0n) throw new TypeError('Amount must be nonzero');
  return { direction: negative ? 'debit' : 'credit', amountMinor: amount.toString() };
}

function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(date + 'T00:00:00.000Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date;
}

/** Read-only import preview. Approval, deduplication and persistence are separate server-side steps. */
export function parseTransactionCsv(csv: string): ImportPreview {
  if (typeof csv !== 'string') throw new TypeError('CSV input must be text');
  if (new TextEncoder().encode(csv).length > MAX_CSV_BYTES) throw new RangeError('CSV file is too large');
  const records = readCsvRecords(csv.replace(/^\uFEFF/, ''));
  if (!records.length) return { validRows: [], errors: [], totalRows: 0 };
  const headers = records[0].map((header) => header.trim().toLowerCase());
  const required = ['date', 'merchant', 'amount', 'currency'];
  if (new Set(headers).size !== headers.length || required.some((item) => !headers.includes(item))) {
    throw new TypeError('CSV headers must include date, merchant, amount, currency without duplicates');
  }
  const positions = Object.fromEntries(required.map((item) => [item, headers.indexOf(item)])) as Record<string, number>;
  const validRows: ImportPreviewRow[] = [];
  const errors: ImportRowError[] = [];
  for (let index = 1; index < records.length; index++) {
    const record = records[index];
    const line = index + 1; // Logical CSV record number; quoted values can span physical lines.
    try {
      if (record.length !== headers.length) throw new TypeError('Incorrect number of columns');
      const date = record[positions.date].trim();
      const merchant = record[positions.merchant].trim();
      const currency = record[positions.currency].trim().toUpperCase();
      if (!validDate(date)) throw new TypeError('Invalid ISO date');
      if (merchant.length === 0 || merchant.length > 120) throw new TypeError('Merchant must be 1 to 120 characters');
      if (!Object.hasOwn(CURRENCY_MINOR_DIGITS, currency)) throw new TypeError('Unsupported currency');
      const amount = minorAmount(record[positions.amount], currency as CurrencyCode);
      validRows.push({ line, date, merchant, currency: currency as CurrencyCode, ...amount });
    } catch (error) {
      errors.push({ line, message: error instanceof Error ? error.message : 'Invalid row' });
    }
  }
  return { validRows, errors, totalRows: records.length - 1 };
}
