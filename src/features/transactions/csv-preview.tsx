'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { MAX_CSV_BYTES, parseTransactionCsv, type ImportPreview } from './csv-import';
import { Card, CardHeader } from '../../components/ui/card';

export function CsvImportPreview() {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(null);
    setError(null);
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) { setError('CSV file must be 1 MB or smaller.'); return; }
    try { setCsv(await file.text()); }
    catch { setError('Could not read this file.'); }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try { setPreview(parseTransactionCsv(csv)); }
    catch (cause) { setPreview(null); setError(cause instanceof Error ? cause.message : 'Invalid CSV'); }
  }

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader title="CSV import preview" eyebrow="Read-only, no changes to your account" />
      <p className="mt-3 text-sm leading-6 text-slate-600">Select a CSV file or paste its contents. Required headers: <code>date,merchant,amount,currency</code>. Use YYYY-MM-DD dates, positive amounts for credits, and negative amounts for debits. Each row is checked separately.</p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <label htmlFor="transaction-csv-file" className="block text-sm font-medium text-slate-700">Choose a CSV file (1 MB maximum)</label>
        <input id="transaction-csv-file" type="file" accept=".csv,text/csv" onChange={onFileChange} className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" />
        <label htmlFor="transaction-csv-text" className="block text-sm font-medium text-slate-700">CSV contents</label>
        <textarea id="transaction-csv-text" value={csv} onChange={(event) => { setCsv(event.target.value); setPreview(null); }} rows={4}
          placeholder={'date,merchant,amount,currency\n2026-10-12,Campus Dining,-25.50,CNY'}
          className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500" />
        <button type="submit" className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Validate and preview</button>
      </form>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      {preview ? (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p className="text-sm font-semibold text-slate-900">{preview.validRows.length} valid / {preview.errors.length} invalid out of {preview.totalRows} rows</p>
          <p className="text-xs text-amber-800">Preview only. No rows are saved or transferred. Import execution requires a separate approval and deduplication workflow.</p>
          {preview.errors.length > 0 ? <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">{preview.errors.slice(0, 20).map((issue) => <li key={issue.line}>Record {issue.line}: {issue.message}</li>)}</ul> : null}
          {preview.validRows.length > 0 ? <div className="max-h-56 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[460px] text-left text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2">Date</th><th className="p-2">Merchant</th><th className="p-2">Direction</th><th className="p-2">Minor units</th><th className="p-2">Currency</th></tr></thead>
              <tbody>{preview.validRows.slice(0, 50).map((row) => <tr key={row.line} className="border-t border-slate-100"><td className="p-2">{row.date}</td><td className="p-2">{row.merchant}</td><td className="p-2">{row.direction}</td><td className="p-2 tabular-nums">{row.amountMinor}</td><td className="p-2">{row.currency}</td></tr>)}</tbody>
            </table>
          </div> : null}
          {preview.validRows.length > 50 ? <p className="text-xs text-slate-500">Showing first 50 valid rows in preview.</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
