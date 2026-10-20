'use client';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { formatMoney, money } from '../../domain/money';
import { MAX_CSV_BYTES } from './csv-import';
import { decodeWalletCsv, dedupeWalletRows, parseWalletCsv } from './wallet-csv';
import { useOptionalDemo } from '../../demo/demo-context';
import { Card, CardHeader } from '../../components/ui/card';

export function CsvImportPreview() {
  const demo = useOptionalDemo();
  const fileVersion = useRef(0);
  const [accountId, setAccountId] = useState('');
  const [csv, setCsv] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReturnType<typeof parseWalletCsv> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const version = ++fileVersion.current;
    const file = event.target.files?.[0];
    setCsv('');
    setPreview(null);
    setError(null);
    setSelectedFile(file?.name ?? null);
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) { setError('CSV file must be 1 MB or smaller.'); return; }
    try { const text = decodeWalletCsv(await file.arrayBuffer()); if (fileVersion.current === version) setCsv(text); }
    catch { if (fileVersion.current !== version) return; setCsv(''); setError('Could not read this file.'); }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try { setPreview(parseWalletCsv(csv)); }
    catch (cause) { setPreview(null); setError(cause instanceof Error ? cause.message : 'Invalid CSV'); }
  }

  const deduped = preview ? dedupeWalletRows(preview.validRows, demo?.snapshot.transactions ?? []) : null;
  const accounts = demo?.snapshot.accounts.filter(a => a.ownerId === demo.snapshot.users[0]?.id && a.currency === 'CNY' && a.status === 'active') ?? [];
  const selectedAccount = accountId || accounts[0]?.id || '';
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader title="CSV import preview" eyebrow="Review wallet history before approval" />
      <p className="mt-3 text-sm leading-6 text-slate-600">Upload an Alipay or WeChat Pay exported bill (UTF-8 or GBK), or paste CSV contents. Historical records update transactions and budget spending; current account balances stay unchanged. For generic CSV, required headers: <code>date,merchant,amount,currency</code>. Use YYYY-MM-DD dates, positive amounts for credits, and negative amounts for debits. Each row is checked separately.</p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <p className="text-sm font-medium text-slate-700">Choose a CSV file (1 MB maximum)</p>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="transaction-csv-file" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">
            Choose CSV file
          </label>
          <input id="transaction-csv-file" type="file" accept=".csv,text/csv" onChange={onFileChange} aria-label="Choose a CSV file" className="sr-only peer" />
          {selectedFile ? <span className="max-w-xs truncate text-xs text-slate-600" title={selectedFile}>{selectedFile}</span> : null}
        </div>
        <label htmlFor="transaction-csv-text" className="block text-sm font-medium text-slate-700">CSV contents</label>
        <textarea id="transaction-csv-text" value={csv} onChange={(event) => { fileVersion.current++; setCsv(event.target.value); setPreview(null); setError(null); }} rows={4}
          placeholder={'date,merchant,amount,currency\n2026-10-12,Campus Dining,-25.50,CNY'}
          className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500" />
        <button type="submit" className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Validate and preview</button>
      </form>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      {preview ? (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p className="text-sm font-semibold text-slate-900">{preview.validRows.length} valid / {preview.errors.length} invalid out of {preview.totalRows} rows; {deduped?.duplicateCount ?? 0} duplicate / {preview.skippedRows.length} excluded</p>
          <p className="text-xs text-amber-800">Preview only. Your transactions have not changed. Refunds, transfers, neutral records and incomplete payments are excluded.</p>
          {preview.skippedRows.length > 0 ? <ul className="text-xs text-amber-800">{preview.skippedRows.slice(0,20).map(issue=><li key={issue.line}>Record {issue.line}: {issue.message}</li>)}</ul> : null}
          {demo ? <div className="flex flex-wrap items-center gap-3"><label htmlFor="wallet-import-account">CNY history account</label><select id="wallet-import-account" value={selectedAccount} onChange={e=>setAccountId(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.type} · {formatMoney(a.availableBalance)}</option>)}</select><button type="button" disabled={!selectedAccount || !deduped?.unique.length || !!demo.pending} onClick={()=>{if(deduped?.unique.length) demo.request({type:'import-transactions',accountId:selectedAccount,rows:deduped.unique});}} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Review history import</button></div> : null}
          {preview.errors.length > 0 ? <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">{preview.errors.slice(0, 20).map((issue) => <li key={issue.line}>Record {issue.line}: {issue.message}</li>)}</ul> : null}
          {preview.validRows.length > 0 ? <div className="max-h-56 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[460px] text-left text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2">Date</th><th className="p-2">Merchant</th><th className="p-2">Direction</th><th className="p-2">Amount</th><th className="p-2">Currency</th></tr></thead>
              <tbody>{preview.validRows.slice(0, 50).map((row, index) => <tr key={index} className="border-t border-slate-100"><td className="p-2">{row.date}</td><td className="p-2">{row.merchant}</td><td className="p-2">{row.direction}</td><td className="p-2 tabular-nums">{formatMoney(money(row.amountMinor,row.currency))}</td><td className="p-2">{row.currency}</td></tr>)}</tbody>
            </table>
          </div> : null}
          {preview.validRows.length > 50 ? <p className="text-xs text-slate-500">Showing first 50 valid rows in preview.</p> : null}
        </div>
      ) : null}
    </Card>
  );
}

