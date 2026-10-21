'use client';

import { LocalizedButton, LocalizedCode, LocalizedDiv, LocalizedForm, LocalizedInput, LocalizedLabel, LocalizedLi, LocalizedOption, LocalizedP, LocalizedSelect, LocalizedSpan, LocalizedTable, LocalizedTbody, LocalizedTd, LocalizedTextarea, LocalizedTh, LocalizedThead, LocalizedTr, LocalizedUl } from '../../i18n/localized';
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
      <LocalizedP className="mt-3 text-sm leading-6 text-slate-600">Upload an Alipay or WeChat Pay exported bill (UTF-8 or GBK), or paste CSV contents. Historical records update transactions and budget spending; current account balances stay unchanged. For generic CSV, required headers: <LocalizedCode>date,merchant,amount,currency</LocalizedCode>. Use YYYY-MM-DD dates, positive amounts for credits, and negative amounts for debits. Each row is checked separately.</LocalizedP>
      <LocalizedForm className="mt-4 space-y-3" onSubmit={onSubmit}>
        <LocalizedP className="text-sm font-medium text-slate-700">Choose a CSV file (1 MB maximum)</LocalizedP>
        <LocalizedDiv className="flex flex-wrap items-center gap-3">
          <LocalizedLabel htmlFor="transaction-csv-file" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">
            Choose CSV file
          </LocalizedLabel>
          <LocalizedInput id="transaction-csv-file" type="file" accept=".csv,text/csv" onChange={onFileChange} aria-label="Choose a CSV file" className="sr-only peer" />
          {selectedFile ? <LocalizedSpan className="max-w-xs truncate text-xs text-slate-600" title={selectedFile}>{selectedFile}</LocalizedSpan> : null}
        </LocalizedDiv>
        <LocalizedLabel htmlFor="transaction-csv-text" className="block text-sm font-medium text-slate-700">CSV contents</LocalizedLabel>
        <LocalizedTextarea id="transaction-csv-text" value={csv} onChange={(event) => { fileVersion.current++; setCsv(event.target.value); setPreview(null); setError(null); }} rows={4}
          placeholder={'date,merchant,amount,currency\n2026-10-12,Campus Dining,-25.50,CNY'}
          className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500" />
        <LocalizedButton type="submit" className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Validate and preview</LocalizedButton>
      </LocalizedForm>
      {error ? <LocalizedP role="alert" className="mt-3 text-sm text-red-700">{error}</LocalizedP> : null}
      {preview ? (
        <LocalizedDiv className="mt-4 space-y-3" aria-live="polite">
          <LocalizedP className="text-sm font-semibold text-slate-900">{preview.validRows.length} valid / {preview.errors.length} invalid out of {preview.totalRows} rows; {deduped?.duplicateCount ?? 0} duplicate / {preview.skippedRows.length} excluded</LocalizedP>
          <LocalizedP className="text-xs text-amber-800">Preview only. Your transactions have not changed. Refunds, transfers, neutral records and incomplete payments are excluded.</LocalizedP>
          {preview.skippedRows.length > 0 ? <LocalizedUl className="text-xs text-amber-800">{preview.skippedRows.slice(0,20).map(issue=><LocalizedLi key={issue.line}>Record {issue.line}: {issue.message}</LocalizedLi>)}</LocalizedUl> : null}
          {demo ? <LocalizedDiv className="flex flex-wrap items-center gap-3"><LocalizedLabel htmlFor="wallet-import-account">CNY history account</LocalizedLabel><LocalizedSelect id="wallet-import-account" value={selectedAccount} onChange={e=>setAccountId(e.target.value)}>{accounts.map(a=><LocalizedOption key={a.id} value={a.id}>{a.type} · {formatMoney(a.availableBalance)}</LocalizedOption>)}</LocalizedSelect><LocalizedButton type="button" disabled={!selectedAccount || !deduped?.unique.length || !!demo.pending} onClick={()=>{if(deduped?.unique.length) demo.request({type:'import-transactions',accountId:selectedAccount,rows:deduped.unique});}} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Review history import</LocalizedButton></LocalizedDiv> : null}
          {preview.errors.length > 0 ? <LocalizedUl className="list-disc space-y-1 pl-5 text-sm text-red-700">{preview.errors.slice(0, 20).map((issue) => <LocalizedLi key={issue.line}>Record {issue.line}: {issue.message}</LocalizedLi>)}</LocalizedUl> : null}
          {preview.validRows.length > 0 ? <LocalizedDiv className="max-h-56 overflow-auto rounded-xl border border-slate-200">
            <LocalizedTable className="w-full min-w-[460px] text-left text-xs"><LocalizedThead className="sticky top-0 bg-slate-50"><LocalizedTr><LocalizedTh className="p-2">Date</LocalizedTh><LocalizedTh className="p-2">Merchant</LocalizedTh><LocalizedTh className="p-2">Direction</LocalizedTh><LocalizedTh className="p-2">Amount</LocalizedTh><LocalizedTh className="p-2">Currency</LocalizedTh></LocalizedTr></LocalizedThead>
              <LocalizedTbody>{preview.validRows.slice(0, 50).map((row, index) => <LocalizedTr key={index} className="border-t border-slate-100"><LocalizedTd className="p-2">{row.date}</LocalizedTd><LocalizedTd className="p-2">{row.merchant}</LocalizedTd><LocalizedTd className="p-2">{row.direction}</LocalizedTd><LocalizedTd className="p-2 tabular-nums">{formatMoney(money(row.amountMinor,row.currency))}</LocalizedTd><LocalizedTd className="p-2">{row.currency}</LocalizedTd></LocalizedTr>)}</LocalizedTbody>
            </LocalizedTable>
          </LocalizedDiv> : null}
          {preview.validRows.length > 50 ? <LocalizedP className="text-xs text-slate-500">Showing first 50 valid rows in preview.</LocalizedP> : null}
        </LocalizedDiv>
      ) : null}
    </Card>
  );
}

