'use client';
import { LocalizedArticle, LocalizedButton, LocalizedDd, LocalizedDiv, LocalizedDl, LocalizedDt, LocalizedH1, LocalizedH2, LocalizedH3, LocalizedInput, LocalizedLabel, LocalizedOption, LocalizedP, LocalizedSection, LocalizedSelect, LocalizedTable, LocalizedTbody, LocalizedTd, LocalizedTfoot, LocalizedTh, LocalizedThead, LocalizedTr } from '../../i18n/localized';
import { useEffect, useState } from 'react';
import type { CurrencyCode } from '../../domain/currency';
import { formatMoney } from '../../domain/money';
import { useDemo } from '../../demo/demo-context';
import { useDemoOverview } from '../overview/use-overview';
import { buildParentSummary, decodeParentSummary, encodeParentSummary, formatSummaryMoney, reportMonthAt, type ParentSummary } from './parent-summary';

export function ParentSummaryWorkspace() {
  const { snapshot } = useDemo();
  const overview = useDemoOverview();
  const [month,setMonth] = useState(() => reportMonthAt(snapshot.asOf));
  const [currency,setCurrency] = useState<CurrencyCode>('IDR');
  const [shared,setShared] = useState<ParentSummary|null>(null);
  const [error,setError] = useState('');
  const [link,setLink] = useState('');
  const [notice,setNotice] = useState('');
  useEffect(() => {
    const readFragment = () => {
      setError(''); setShared(null); setLink('');
      if (!window.location.hash) return;
      try { setShared(decodeParentSummary(window.location.hash)); }
      catch { setError('This shared report link is invalid or incomplete.'); }
    };
    queueMicrotask(readFragment);
    window.addEventListener('hashchange',readFragment);
    return () => window.removeEventListener('hashchange',readFragment);
  },[]);
  const report = error ? null : shared ?? (overview && /^20\d{2}-(0[1-9]|1[0-2])$/.test(month) ? buildParentSummary(snapshot, overview, month, currency) : null);
  const display = (minor: string) => report ? formatMoney(formatSummaryMoney(minor,report.currency)) : '';
  function share() {
    if (!report) return;
    try { setLink(`${window.location.origin}/parent-summary#report=${encodeParentSummary(report)}`); setNotice('Link created. Anyone with this link can read these fictional totals.'); }
    catch { setNotice('Could not create a share link for this report.'); }
  }
  async function copy() {
    try { if (!navigator.clipboard) { setNotice('Select the link and copy it manually.'); return; } await navigator.clipboard.writeText(link); setNotice('Report link copied.'); }
    catch { setNotice('Copy is unavailable. Select the link and copy it manually.'); }
  }
  return <LocalizedSection className="parent-summary-workspace">
    <style>{`@media print { .parent-summary-controls { display:none!important; } .parent-summary-report { color:#000; background:#fff; border:0; } .parent-summary-report article { break-inside:avoid; } } .parent-summary-workspace { padding:24px; max-width:1000px; margin:auto; } .parent-summary-controls { display:flex; gap:12px; align-items:end; flex-wrap:wrap; margin:20px 0; } .parent-summary-controls label { display:grid; gap:6px; } .parent-summary-report { padding:24px; border:1px solid var(--border,#ddd); border-radius:16px; } .parent-summary-report table { width:100%; border-collapse:collapse; } .parent-summary-report th,.parent-summary-report td { padding:10px 0; text-align:left; border-bottom:1px solid #ddd; } .parent-summary-report dl { display:grid; grid-template-columns:minmax(160px,1fr) 1fr; gap:12px; } .parent-summary-report dd { margin:0; } .parent-summary-controls input[readonly] { width:min(700px,80vw); }`}</style>
    <LocalizedDiv className="parent-summary-controls"><LocalizedH1>Parent monthly report</LocalizedH1></LocalizedDiv>
    {error ? <LocalizedP role="alert">{error}</LocalizedP> : null}
    {!shared && !error && <LocalizedDiv className="parent-summary-controls">
      <LocalizedLabel>Spending month<LocalizedInput type="month" min="2000-01" max="2099-12" value={month} onChange={event=>setMonth(event.target.value)} /></LocalizedLabel>
      <LocalizedLabel>Report currency<LocalizedSelect value={currency} onChange={event=>setCurrency(event.target.value as CurrencyCode)}>{(['IDR','CNY','USD','SGD'] as const).map(code=><LocalizedOption key={code}>{code}</LocalizedOption>)}</LocalizedSelect></LocalizedLabel>
    </LocalizedDiv>}
    {report ? <>
      <LocalizedDiv className="parent-summary-controls"><LocalizedButton type="button" onClick={share}>Create share link</LocalizedButton><LocalizedButton type="button" onClick={()=>window.print()}>Print / Save as PDF</LocalizedButton></LocalizedDiv>
      {link && <LocalizedDiv className="parent-summary-controls"><LocalizedLabel>Share link<LocalizedInput readOnly value={link} onFocus={event=>event.currentTarget.select()} /></LocalizedLabel><LocalizedButton type="button" onClick={()=>void copy()}>Copy link</LocalizedButton></LocalizedDiv>}
      <LocalizedP className="parent-summary-controls" role="status">{notice}</LocalizedP>
      <LocalizedDiv className="parent-summary-report" id="parent-summary-report">
        <LocalizedH2>{report.month} monthly spending report</LocalizedH2>
        <LocalizedP>{shared ? 'Shared, read-only report. Figures reflect the saved report, not live account data.' : 'Fictional sandbox report. No real financial activity.'}</LocalizedP>
        <LocalizedP>All amounts in {report.currency}, converted using fixed sandbox ledger reference rates. This report contains aggregated fictional figures only. Anyone with the link can read them.</LocalizedP>
        <LocalizedArticle><LocalizedH3>Spending by category · {report.month}</LocalizedH3>
          <LocalizedTable><LocalizedThead><LocalizedTr><LocalizedTh scope="col">Category</LocalizedTh><LocalizedTh scope="col">Spending ({report.currency})</LocalizedTh></LocalizedTr></LocalizedThead><LocalizedTbody>{report.categories.map(row=><LocalizedTr key={row.category}><LocalizedTd>{row.category.replaceAll('-',' ')}</LocalizedTd><LocalizedTd>{display(row.amountMinor)}</LocalizedTd></LocalizedTr>)}</LocalizedTbody><LocalizedTfoot><LocalizedTr><LocalizedTh scope="row">Total consumption spending</LocalizedTh><LocalizedTd>{display(report.spendingMinor)}</LocalizedTd></LocalizedTr></LocalizedTfoot></LocalizedTable>
          {!report.categories.length && <LocalizedP>No consumption transactions recorded for this month.</LocalizedP>}
        </LocalizedArticle>
        <LocalizedArticle><LocalizedH3>Current snapshot · {report.asOf.slice(0,10)}</LocalizedH3><LocalizedP>Balances, runway and tuition below use the snapshot date, independently of the selected spending month.</LocalizedP>
          <LocalizedDl><LocalizedDt>Available cash</LocalizedDt><LocalizedDd>{display(report.availableCashMinor)}</LocalizedDd><LocalizedDt>Cash after next tuition reserve</LocalizedDt><LocalizedDd>{display(report.postTuitionCashMinor)}</LocalizedDd><LocalizedDt>Remaining cash runway</LocalizedDt><LocalizedDd>{report.cashRunwayMonths===null?'No current spending rate':`${report.cashRunwayMonths.toFixed(1)} months`}</LocalizedDd><LocalizedDt>Net burn runway</LocalizedDt><LocalizedDd>{report.netBurnRunwayMonths === null ? 'No positive net burn in this snapshot' : `${report.netBurnRunwayMonths.toFixed(1)} months`}</LocalizedDd></LocalizedDl>
          <LocalizedP>Cash runway uses current observed monthly consumption after reserving next tuition. Net burn also offsets observed recurring income; one-off income is excluded. These are estimates, not guarantees.</LocalizedP>
          <LocalizedH3>Upcoming tuition at snapshot date</LocalizedH3>{report.tuition ? <LocalizedP>Due {report.tuition.dueDate} · outstanding {display(report.tuition.outstandingMinor)}</LocalizedP> : <LocalizedP>No unpaid tuition recorded.</LocalizedP>}
        </LocalizedArticle>
      </LocalizedDiv>
    </> : <LocalizedP>{error ? 'Open a valid report link to view its saved figures.' : 'Preparing report. Select a valid month if none is selected.'}</LocalizedP>}
  </LocalizedSection>;
}
