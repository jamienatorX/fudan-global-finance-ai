'use client';
import { useEffect, useMemo, useState } from 'react';
import { useDemo } from '../../demo/demo-context';
import { DEMO_USER_ID } from '../../demo/seed';
import type { FinancialRepository } from '../../domain/financial-repository';
import { formatMoney } from '../../domain/money';
import { CURRENCY_MINOR_DIGITS, type CurrencyCode } from '../../domain/currency';
import { getOverviewModel, type OverviewModel } from '../overview/overview-queries';
import { OverviewDashboard } from '../overview/overview-dashboard';
import { AccountList } from '../accounts/account-list';
import { AccountLink as Link } from '../../components/shell/account-link';
import { TransactionTable } from '../transactions/transaction-table';
import { CsvImportPreview } from '../transactions/csv-preview';
import { buildSpendingReport } from '../transactions/reporting';

function useDemoOverview(selectedAccount?: string) {
  const {snapshot}=useDemo();
  const [overview,setOverview]=useState<OverviewModel|null>(null);
  useEffect(()=>{
    let active=true;
    const port={getSnapshot:async()=>snapshot} as unknown as FinancialRepository;
    void getOverviewModel(port,DEMO_USER_ID,selectedAccount).then(data=>{if(active)setOverview(data);});
    return ()=>{active=false;};
  },[snapshot,selectedAccount]);
  return overview;
}
export function LiveOverview({account}:{account?:string}){
  const overview=useDemoOverview(account);
  return overview?<OverviewDashboard overview={overview}/>:<p role="status" className="p-5 text-sm text-slate-600">Preparing simulated overview…</p>;
}
export function LiveAccounts(){
  const {snapshot}=useDemo();
  const overview=useDemoOverview();
  return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Live browser-local simulation</p>
    <h1 className="mt-1 text-3xl font-bold">Accounts & balances</h1><p className="mt-2 text-sm text-slate-600">Balances change after approved demo actions. Each account keeps its original currency. CNY equivalents use fixed fallback fixtures, not live prices.</p></header>
    <section className="rounded-2xl bg-[var(--color-navy)] p-6 text-white"><p className="text-sm text-blue-200">Total available demo cash · CNY reference</p>
      <p className="mt-2 text-3xl font-bold">{overview?formatMoney(overview.availableCash):'Calculating…'}</p>
      <p className="mt-2 text-xs text-blue-100">Fictional demo fixture · {snapshot.accounts.length} accounts</p></section>
    <AccountList accounts={snapshot.accounts} reportingBalances={overview?.accountBalances??[]}/>
    <Link href="/overview" className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-blue-700">Back to overview</Link></div>;
}
function prevMonth(month:string){
  const [year,n]=month.split('-').map(Number);
  return new Date(Date.UTC(year,n-2,1)).toISOString().slice(0,7);
}
export function LiveTransactions({initialAccount,initialCurrency,initialMonth,initialSearch}:{initialAccount?:string;initialCurrency?:string;initialMonth?:string;initialSearch?:string}){
  const {snapshot}=useDemo();
  const [account,setAccount]=useState(initialAccount??'');
  const [currency,setCurrency]=useState<CurrencyCode>(initialCurrency&&Object.hasOwn(CURRENCY_MINOR_DIGITS,initialCurrency)?initialCurrency as CurrencyCode:'CNY');
  const [month,setMonth]=useState(initialMonth&&/^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth)?initialMonth:snapshot.asOf.slice(0,7));
  const [search,setSearch]=useState(initialSearch??'');
  const [query,setQuery]=useState('');
  const owned=account?snapshot.accounts.some(a=>a.id===account):true;
  const report=useMemo(()=>buildSpendingReport(snapshot.transactions,month,prevMonth(month),currency,owned?account||undefined:undefined),[snapshot,month,currency,account,owned]);
  const transactions=useMemo(()=>snapshot.transactions.filter(t=>
    t.ownerId===snapshot.users[0].id &&(!account||t.accountId===account)&&t.amount.currency===currency&&
    t.occurredAt.startsWith(month+'-')&&(!query||t.merchant.toLowerCase().includes(query.toLowerCase())||t.category.includes(query.toLowerCase()))
  ).toSorted((a,b)=>b.occurredAt.localeCompare(a.occurredAt)||b.id.localeCompare(a.id)),[snapshot,account,currency,month,query]);
  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Interactive · transaction reporting</p><h1 className="mt-1 text-3xl font-bold">Transactions & bill analysis</h1>
      <p className="mt-2 text-sm text-slate-600">Income and consumption totals exclude internal transfers and asset movements. Currency-specific totals do not mix FX rates. Approved actions appear on this page without reloading.</p></header>
    <form onSubmit={e=>{e.preventDefault();setQuery(search)}} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-semibold">Account<select className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3" value={account} onChange={e=>{setAccount(e.target.value);if(e.target.value){const found=snapshot.accounts.find(a=>a.id===e.target.value);if(found)setCurrency(found.currency);}}}>
        <option value="">All accounts</option>{snapshot.accounts.map(a=><option key={a.id} value={a.id}>{a.currency} {a.type}</option>)}</select></label>
      <label className="text-sm font-semibold">Currency<select className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3" value={currency} onChange={e=>setCurrency(e.target.value as CurrencyCode)}>
        {Object.keys(CURRENCY_MINOR_DIGITS).map(c=><option key={c}>{c}</option>)}</select></label>
      <label className="text-sm font-semibold">Month<input className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>
      <label className="text-sm font-semibold">Merchant search<input className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3" type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <button className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white sm:col-span-2 lg:col-span-4">Apply search</button>
    </form>
    <div className="grid gap-4 sm:grid-cols-3">{[['Income',report.income],['Consumption',report.expenses],['Net cash flow',report.netCashFlow]].map(([label,value])=>
      <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label as string}</p>
        <strong className="mt-2 block text-2xl">{formatMoney(value as typeof report.income)}</strong></div>)}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Spending by category</h2>
      {report.categories.length===0?<p className="mt-3 text-sm text-slate-500">No consumption in this period.</p>:
        <ul className="mt-3 divide-y divide-slate-100">{report.categories.map(c=><li key={c.category} className="flex justify-between py-2 text-sm capitalize"><span>{c.category}</span><strong>{formatMoney(c.amount)}</strong></li>)}</ul>}
      <p className="mt-3 text-xs text-slate-500">{report.comparison.status==='insufficient-data'?'Insufficient previous-month data for comparison.':
        report.comparison.expenseChangeBasisPoints===null?'Prior consumption was zero, percentage change unavailable.':
        'Change vs '+report.comparisonPeriod+': '+(report.comparison.expenseChangeBasisPoints/100).toFixed(1)+'%'}</p>
      <p className="mt-1 text-xs text-slate-500">{report.anomalies.length} spending anomalies · {report.recurringCount} recurring entries</p></section>
    <TransactionTable transactions={transactions.slice(0,100)} total={transactions.length}/>
    <CsvImportPreview/>
  </div>;
}
