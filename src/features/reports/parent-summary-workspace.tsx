'use client';
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
  return <section className="parent-summary-workspace">
    <style>{`@media print { .parent-summary-controls { display:none!important; } .parent-summary-report { color:#000; background:#fff; border:0; } .parent-summary-report article { break-inside:avoid; } } .parent-summary-workspace { padding:24px; max-width:1000px; margin:auto; } .parent-summary-controls { display:flex; gap:12px; align-items:end; flex-wrap:wrap; margin:20px 0; } .parent-summary-controls label { display:grid; gap:6px; } .parent-summary-report { padding:24px; border:1px solid var(--border,#ddd); border-radius:16px; } .parent-summary-report table { width:100%; border-collapse:collapse; } .parent-summary-report th,.parent-summary-report td { padding:10px 0; text-align:left; border-bottom:1px solid #ddd; } .parent-summary-report dl { display:grid; grid-template-columns:minmax(160px,1fr) 1fr; gap:12px; } .parent-summary-report dd { margin:0; } .parent-summary-controls input[readonly] { width:min(700px,80vw); }`}</style>
    <div className="parent-summary-controls"><h1>Parent monthly report</h1></div>
    {error ? <p role="alert">{error}</p> : null}
    {!shared && !error && <div className="parent-summary-controls">
      <label>Spending month<input type="month" min="2000-01" max="2099-12" value={month} onChange={event=>setMonth(event.target.value)} /></label>
      <label>Report currency<select value={currency} onChange={event=>setCurrency(event.target.value as CurrencyCode)}>{(['IDR','CNY','USD','SGD'] as const).map(code=><option key={code}>{code}</option>)}</select></label>
    </div>}
    {report ? <>
      <div className="parent-summary-controls"><button type="button" onClick={share}>Create share link</button><button type="button" onClick={()=>window.print()}>Print / Save as PDF</button></div>
      {link && <div className="parent-summary-controls"><label>Share link<input readOnly value={link} onFocus={event=>event.currentTarget.select()} /></label><button type="button" onClick={()=>void copy()}>Copy link</button></div>}
      <p className="parent-summary-controls" role="status">{notice}</p>
      <div className="parent-summary-report" id="parent-summary-report">
        <h2>{report.month} monthly spending report</h2>
        <p>{shared ? 'Shared, read-only report. Figures reflect the saved report, not live account data.' : 'Fictional sandbox report. No real financial activity.'}</p>
        <p>All amounts in {report.currency}, converted using fixed sandbox ledger reference rates. This report contains aggregated fictional figures only. Anyone with the link can read them.</p>
        <article><h3>Spending by category · {report.month}</h3>
          <table><thead><tr><th scope="col">Category</th><th scope="col">Spending ({report.currency})</th></tr></thead><tbody>{report.categories.map(row=><tr key={row.category}><td>{row.category.replaceAll('-',' ')}</td><td>{display(row.amountMinor)}</td></tr>)}</tbody><tfoot><tr><th scope="row">Total consumption spending</th><td>{display(report.spendingMinor)}</td></tr></tfoot></table>
          {!report.categories.length && <p>No consumption transactions recorded for this month.</p>}
        </article>
        <article><h3>Current snapshot · {report.asOf.slice(0,10)}</h3><p>Balances, runway and tuition below use the snapshot date, independently of the selected spending month.</p>
          <dl><dt>Available cash</dt><dd>{display(report.availableCashMinor)}</dd><dt>Cash after next tuition reserve</dt><dd>{display(report.postTuitionCashMinor)}</dd><dt>Remaining cash runway</dt><dd>{report.cashRunwayMonths===null?'No current spending rate':`${report.cashRunwayMonths.toFixed(1)} months`}</dd><dt>Net burn runway</dt><dd>{report.netBurnRunwayMonths === null ? 'No positive net burn in this snapshot' : `${report.netBurnRunwayMonths.toFixed(1)} months`}</dd></dl>
          <p>Cash runway uses current observed monthly consumption after reserving next tuition. Net burn also offsets observed recurring income; one-off income is excluded. These are estimates, not guarantees.</p>
          <h3>Upcoming tuition at snapshot date</h3>{report.tuition ? <p>Due {report.tuition.dueDate} · outstanding {display(report.tuition.outstandingMinor)}</p> : <p>No unpaid tuition recorded.</p>}
        </article>
      </div>
    </> : <p>{error ? 'Open a valid report link to view its saved figures.' : 'Preparing report. Select a valid month if none is selected.'}</p>}
  </section>;
}
