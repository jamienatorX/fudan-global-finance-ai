'use client';
import { LocalizedButton, LocalizedDiv, LocalizedForm, LocalizedH1, LocalizedH2, LocalizedHeader, LocalizedInput, LocalizedLabel, LocalizedLi, LocalizedOption, LocalizedP, LocalizedSection, LocalizedSelect, LocalizedSpan, LocalizedStrong, LocalizedUl } from '../../i18n/localized';
import { useMemo, useState } from 'react';
import { useDemo } from '../../demo/demo-context';
import { TuitionFxCard } from '../overview/tuition-fx-card';
import { SafeToSpendHero } from '../overview/safe-to-spend-hero';
import { useDemoOverview } from '../overview/use-overview';
import { formatMoney } from '../../domain/money';
import { CURRENCY_MINOR_DIGITS, type CurrencyCode } from '../../domain/currency';



import { DemoConversation } from '../copilot/demo-conversation';
import { OverviewDashboard } from '../overview/overview-dashboard';
import { displayOverviewCurrency } from '../overview/overview-currency';
import { AccountList } from '../accounts/account-list';
import { AccountLink as Link } from '../../components/shell/account-link';
import { TransactionTable } from '../transactions/transaction-table';
import { CsvImportPreview } from '../transactions/csv-preview';
import { buildSpendingReport } from '../transactions/reporting';
import { useValuationSnapshot } from '../fx/use-valuation-snapshot';
import { FxFreshnessLabel } from '../../components/shell/currency-ticker';

export function LiveOverview({account}:{account?:string}){
  const overview=useDemoOverview(account);
  const snapshot=useValuationSnapshot();
  const [reportingCurrency,setReportingCurrency]=useState<CurrencyCode>('CNY');
  const displayed=useMemo(()=>overview?displayOverviewCurrency(overview,reportingCurrency,snapshot.exchangeRates):null,
    [overview,reportingCurrency,snapshot.exchangeRates]);
  return displayed?<LocalizedDiv className="overview-workspace">
    <section className="fufu-overview-heading" aria-label="Your Financial Overview"><p>PERSONAL BANKING</p><h1>Your Financial Overview</h1><p>Your accounts, plans and everyday spending.</p></section>
    <DemoConversation/>
    <LocalizedDiv className="student-reporting-controls flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <LocalizedLabel className="flex flex-wrap items-center gap-3 text-xs font-medium text-[var(--color-text-muted)]">Reporting currency
          <LocalizedSelect aria-label="Dashboard reporting currency" value={reportingCurrency}
            onChange={e=>setReportingCurrency(e.target.value as CurrencyCode)}
            className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 text-sm font-bold text-blue-950">
            {Object.keys(CURRENCY_MINOR_DIGITS).map(code=><LocalizedOption value={code} key={code}>{code}</LocalizedOption>)}
          </LocalizedSelect>
        </LocalizedLabel>

        <span className="text-xs text-[var(--color-text-muted)]"><FxFreshnessLabel /></span>
    </LocalizedDiv>
    <OverviewDashboard overview={displayed} hero={<SafeToSpendHero currency={reportingCurrency}/>} tuition={<TuitionFxCard overview={overview!} compact/>} />

  </LocalizedDiv>:<LocalizedP role="status" className="p-5 text-sm text-slate-600">Loading overview…</LocalizedP>;
}
export function LiveAccounts(){
  const {snapshot}=useDemo();
  const overview=useDemoOverview();
  return <LocalizedDiv className="space-y-6"><LocalizedHeader>
    <LocalizedH1 className="mt-1 text-3xl font-bold">Accounts & balances</LocalizedH1></LocalizedHeader>
    <LocalizedSection className="rounded-2xl bg-[var(--color-navy)] p-6 text-white"><LocalizedP className="text-sm text-blue-200">Total available cash · CNY</LocalizedP>
      <LocalizedP className="mt-2 text-3xl font-bold">{overview?formatMoney(overview.availableCash):'Calculating…'}</LocalizedP>
      <LocalizedP className="mt-2 text-xs text-blue-100">Your accounts · {snapshot.accounts.length} accounts</LocalizedP></LocalizedSection>
    <AccountList accounts={snapshot.accounts} reportingBalances={overview?.accountBalances??[]}/>
    <Link href="/overview" className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-blue-700">Back to overview</Link></LocalizedDiv>;
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
  const [query,setQuery]=useState(initialSearch??'');
  const owned=account?snapshot.accounts.some(a=>a.id===account):true;
  const report=useMemo(()=>buildSpendingReport(snapshot.transactions,month,prevMonth(month),currency,owned?account||undefined:undefined),[snapshot,month,currency,account,owned]);
  const transactions=useMemo(()=>snapshot.transactions.filter(t=>
    t.ownerId===snapshot.users[0].id &&(!account||t.accountId===account)&&t.amount.currency===currency&&
    t.occurredAt.startsWith(month+'-')&&(!query||t.merchant.toLowerCase().includes(query.toLowerCase())||t.category.includes(query.toLowerCase()))
  ).toSorted((a,b)=>b.occurredAt.localeCompare(a.occurredAt)||b.id.localeCompare(a.id)),[snapshot,account,currency,month,query]);
  return <LocalizedDiv className="space-y-6">
    <LocalizedHeader><LocalizedP className="text-xs font-bold uppercase tracking-widest text-blue-700">Your activity</LocalizedP><LocalizedH1 className="mt-1 text-3xl font-bold">Transactions & bill analysis</LocalizedH1>
      </LocalizedHeader>
    <LocalizedForm onSubmit={e=>{e.preventDefault();setQuery(search)}} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
      <LocalizedLabel className="text-sm font-semibold">Account<LocalizedSelect className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3" value={account} onChange={e=>{setAccount(e.target.value);if(e.target.value){const found=snapshot.accounts.find(a=>a.id===e.target.value);if(found)setCurrency(found.currency);}}}>
        <LocalizedOption value="">All accounts</LocalizedOption>{snapshot.accounts.map(a=><LocalizedOption key={a.id} value={a.id}>{a.currency} {a.type}</LocalizedOption>)}</LocalizedSelect></LocalizedLabel>
      <LocalizedLabel className="text-sm font-semibold">Currency<LocalizedSelect className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3" value={currency} onChange={e=>setCurrency(e.target.value as CurrencyCode)}>
        {Object.keys(CURRENCY_MINOR_DIGITS).map(c=><LocalizedOption key={c}>{c}</LocalizedOption>)}</LocalizedSelect></LocalizedLabel>
      <LocalizedLabel className="text-sm font-semibold">Month<LocalizedInput className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></LocalizedLabel>
      <LocalizedLabel className="text-sm font-semibold">Merchant search<LocalizedInput className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 px-3" type="search" value={search} onChange={e=>setSearch(e.target.value)}/></LocalizedLabel>
      <LocalizedButton className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white sm:col-span-2 lg:col-span-4">Apply search</LocalizedButton>
    </LocalizedForm>
    <LocalizedDiv className="grid gap-4 sm:grid-cols-3">{[['Income',report.income],['Consumption',report.expenses],['Net cash flow',report.netCashFlow]].map(([label,value])=>
      <LocalizedDiv key={label as string} className="rounded-2xl border border-slate-200 bg-white p-5"><LocalizedP className="text-sm text-slate-500">{label as string}</LocalizedP>
        <LocalizedStrong className="mt-2 block text-2xl">{formatMoney(value as typeof report.income)}</LocalizedStrong></LocalizedDiv>)}</LocalizedDiv>
    <LocalizedSection className="rounded-2xl border border-slate-200 bg-white p-5"><LocalizedH2 className="font-semibold">Spending by category</LocalizedH2>
      {report.categories.length===0?<LocalizedP className="mt-3 text-sm text-slate-500">No consumption in this period.</LocalizedP>:
        <LocalizedUl className="mt-3 divide-y divide-slate-100">{report.categories.map(c=><LocalizedLi key={c.category} className="flex justify-between py-2 text-sm capitalize"><LocalizedSpan>{c.category}</LocalizedSpan><LocalizedStrong>{formatMoney(c.amount)}</LocalizedStrong></LocalizedLi>)}</LocalizedUl>}
      <LocalizedP className="mt-3 text-xs text-slate-500">{report.comparison.status==='insufficient-data'?'Insufficient previous-month data for comparison.':
        report.comparison.expenseChangeBasisPoints===null?'Prior consumption was zero, percentage change unavailable.':
        'Change vs '+report.comparisonPeriod+': '+(report.comparison.expenseChangeBasisPoints/100).toFixed(1)+'%'}</LocalizedP>
      <LocalizedP className="mt-1 text-xs text-slate-500">{report.anomalies.length} spending anomalies · {report.recurringCount} recurring entries</LocalizedP></LocalizedSection>
    <TransactionTable transactions={transactions.slice(0,100)} total={transactions.length}/>
    <CsvImportPreview/>
  </LocalizedDiv>;
}

