'use client';
import { useState, type ReactNode } from 'react';
import { useDemo } from '../../demo/demo-context';
import type { DemoAction } from '../../demo/demo-engine';
import type { CurrencyCode } from '../../domain/currency';
import { CURRENCY_MINOR_DIGITS } from '../../domain/currency';
import { formatMoney, money } from '../../domain/money';
import { parseMajorAmount, referenceConversion, projectedRunway } from './planning-helpers';

type Page = 'transfers' | 'cards' | 'subscriptions' | 'wealth' | 'fx' | 'planner' | 'audit' | 'settings';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const field = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-2 focus:outline-blue-500';
const button = 'rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700';
const secondary = 'rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50';
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className={card}><h2 className="mb-4 text-lg font-semibold text-slate-950">{title}</h2>{children}</section>;
}
function Label({ caption, children }: { caption: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{caption}{children}</label>;
}
function PageBody({ section }: { section: Page }) {
  const { snapshot, request, reset } = useDemo();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const val = (key: string, fallback = '') => values[key] ?? fallback;
  const set = (key: string, value: string) => setValues(prev => ({...prev, [key]: value}));
  const submit = (action: () => DemoAction) => {
    try { request(action()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Please check these fields.'); }
  };
  const names: Record<Page, [string,string]> = {
    transfers: ['Smart transfers', 'Transfer between your accounts or to a saved recipient.'],
    cards: ['Card management', ''],
    subscriptions: ['Subscription management', ''],
    wealth: ['Wealth management', ''],
    fx: ['FX & cross-border', ''],
    planner: ['Budget & tuition planner', ''],
    audit: ['Audit & notifications', ''],
    settings: ['Settings', ''],
  };
  const [title,description]=names[section];
  const accountId=val('source',snapshot.accounts[0].id);
  const source=snapshot.accounts.find(a=>a.id===accountId) ?? snapshot.accounts[0];
  const totalSubscriptions=snapshot.subscriptions.filter(s=>s.status==='active').reduce((n,s)=>n+(s.cadence==='monthly'?s.amount.amountMinor:s.amount.amountMinor/12n),0n);
  const runway=projectedRunway(snapshot);
  const currency=val('currency','USD') as CurrencyCode;
  const target=val('target','CNY') as CurrencyCode;
  let conversion: ReturnType<typeof referenceConversion> | null = null; let conversionError: string | null = null;
  if (section==='fx') {
    try { conversion=referenceConversion(money(parseMajorAmount(val('fxAmount','100.00'), currency),currency),target,snapshot.exchangeRates); }
    catch(cause) { conversionError=cause instanceof Error?cause.message:'Rate unavailable'; }
  }
  const eligibleCny=snapshot.accounts.filter(a=>a.status==='active'&&a.currency==='CNY');
  return <div className="space-y-6">
    <header>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p></header>
    {section==='transfers' && <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Create a transfer proposal">
        <div className="space-y-4">
          <Label caption="Source account"><select className={field} value={accountId} onChange={e=>{set('source',e.target.value);set('recipient','');}}>
            {snapshot.accounts.filter(a=>a.status==='active').map(a=><option key={a.id} value={a.id}>{a.currency} {a.type} · {formatMoney(a.availableBalance)}</option>)}</select></Label>
          <Label caption="Recipient"><select className={field} value={val('recipient','')} onChange={e=>set('recipient',e.target.value)}>
            <option value="">Choose a recipient</option>
            {snapshot.accounts.filter(a=>a.id!==source.id&&a.currency===source.currency).map(a=><option key={a.id} value={'account:'+a.id}>Own {a.currency} {a.type}</option>)}
            {snapshot.beneficiaries.filter(b=>b.supportedCurrencies.includes(source.currency)).map(b=><option key={b.id} value={'beneficiary:'+b.id}>{b.displayName} · {b.accountAlias}</option>)}
          </select></Label>
          <Label caption={'Amount ('+source.currency+')'}><input className={field} inputMode="decimal" value={val('transferAmount','800.00')} onChange={e=>set('transferAmount',e.target.value)}/></Label>
          <Label caption="Optional schedule (Shanghai UTC+08:00)"><input type="datetime-local" className={field} value={val('schedule')} onChange={e=>set('schedule',e.target.value)}/></Label>
          <button className={button} onClick={()=>submit(()=>{
            const recipient=val('recipient'); if(!recipient)throw new Error('Select a recipient');
            const scheduledAt=val('schedule')?new Date(val('schedule')+':00+08:00').toISOString():undefined;
            return {type:'transfer',sourceId:source.id,amountMinor:parseMajorAmount(val('transferAmount','800.00'),source.currency),scheduledAt,
              ...(recipient.startsWith('account:')?{destinationId:recipient.slice(8)}:{beneficiaryId:recipient.slice(12)})};
          })}>Review transfer</button>
        </div></Panel>
      <Panel title="Transfer history">{snapshot.transfers.toReversed().slice(0,12).map(t=><div key={t.id} className="border-b border-slate-100 py-3 text-sm">
        <div className="flex justify-between"><strong>{formatMoney(t.amount)}</strong><span className="capitalize">{t.status}</span></div>
        <p className="mt-1 text-xs text-slate-500">{t.receiptRef} · {t.scheduledAt ? t.scheduledAt.slice(0,16)+' UTC' : 'Completed'}</p>
      </div>)}</Panel></div>}
    {section==='cards' && <div className="grid gap-5 md:grid-cols-2">{snapshot.cards.map(c=><Panel key={c.id} title={c.purpose.replaceAll('-',' ')+' virtual card'}>
      <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-blue-800 p-6 text-white">
        <p className="text-sm font-semibold">福 bank</p><p className="mt-12 font-mono text-2xl tracking-widest">{c.maskedNumber}</p>
        <p className="mt-3 text-sm capitalize">{c.freezeState}</p>
      </div><p className="mt-4 text-sm">Daily limit: {formatMoney(c.dailyLimit)}</p><p className="mt-1 text-sm">Monthly limit: {formatMoney(c.monthlyLimit)}</p>
      <div className="mt-4"><button className={button} onClick={()=>submit(()=>({type:'card',cardId:c.id,mode:c.freezeState==='frozen'?'unfreeze':'freeze'}))}>{c.freezeState==='frozen'?'Review unfreeze':'Review freeze'}</button></div>
      <div className="mt-4"><Label caption="Change monthly limit (CNY)"><input className={field} value={val('limit:'+c.id)} placeholder="1000.00" onChange={e=>set('limit:'+c.id,e.target.value)}/></Label>
      <button className={secondary+' mt-2'} onClick={()=>submit(()=>({type:'card',cardId:c.id,mode:'limit',limitMinor:parseMajorAmount(val('limit:'+c.id),'CNY')}))}>Review limit change</button></div>
    </Panel>)}</div>}
    {section==='subscriptions' && <>
      <Panel title="Recurring commitments"><p className="text-3xl font-bold">{formatMoney(money(totalSubscriptions,'CNY'))} <span className="text-sm font-normal text-slate-500">/ month</span></p>
      <p className="mt-2 text-xs text-slate-500">Annualized estimate: {formatMoney(money(totalSubscriptions*12n,'CNY'))}.</p></Panel>
      <div className="grid gap-5 md:grid-cols-2">{snapshot.subscriptions.map(s=><Panel key={s.id} title={s.merchant}>
        <div className="flex justify-between gap-2"><strong className="text-xl">{formatMoney(s.amount)} / {s.cadence}</strong><span className="capitalize text-slate-500">{s.status}</span></div>
        <p className="mt-3 text-sm text-slate-600">Renewal: {s.nextRenewalAt.slice(0,10)}</p>
        <p className="mt-1 text-sm text-slate-600">{s.lastUsageAt?'Last used: '+s.lastUsageAt.slice(0,10):'No recorded usage'}</p>
        {s.status==='active'&&<button className={button+' mt-4'} onClick={()=>submit(()=>({type:'subscription',subscriptionId:s.id}))}>Review cancellation</button>}
      </Panel>)}</div></>}
    {section==='wealth' && <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4"><Panel title="Risk preference"><select className={field} value={val('risk','low')} onChange={e=>set('risk',e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Panel>
      {snapshot.investmentProducts.map(p=><Panel key={p.id} title={p.name}>
        <p className="text-sm text-slate-600">{p.category.replaceAll('-',' ')} · {p.simulatedRisk} risk · fee {(p.feeBasisPoints/100).toFixed(2)}% · {p.liquidity}</p>
        <p className="mt-2 text-xs text-slate-500">Illustrative return {(p.historicalSimulation.returnBasisPoints/100).toFixed(2)}%; drawdown {(p.historicalSimulation.drawdownBasisPoints/100).toFixed(2)}%. No guaranteed returns.</p>
        <button className={secondary+' mt-3'} onClick={()=>set('product',p.id)}>Select product</button>
      </Panel>)}</div>
      <div className="space-y-4"><Panel title="Investment order">
        <div className="space-y-3">
          <Label caption="Product"><select className={field} value={val('product',snapshot.investmentProducts[0].id)} onChange={e=>set('product',e.target.value)}>{snapshot.investmentProducts.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></Label>
          <Label caption="Order direction"><select className={field} value={val('direction','buy')} onChange={e=>set('direction',e.target.value)}><option value="buy">Buy</option><option value="redeem">Redeem</option></select></Label>
          <Label caption="Funding account"><select className={field} value={val('funding',eligibleCny[0].id)} onChange={e=>set('funding',e.target.value)}>{eligibleCny.map(a=><option key={a.id} value={a.id}>{a.type} · {formatMoney(a.availableBalance)}</option>)}</select></Label>
          <Label caption="Amount CNY"><input className={field} inputMode="decimal" value={val('investmentAmount','1000.00')} onChange={e=>set('investmentAmount',e.target.value)}/></Label>
          <button className={button} onClick={()=>submit(()=>{
            const p=snapshot.investmentProducts.find(p=>p.id===val('product',snapshot.investmentProducts[0].id))!;
            const ranks={low:0,medium:1,high:2};
            if(val('direction','buy')==='buy' && ranks[p.simulatedRisk]>ranks[val('risk','low') as keyof typeof ranks])throw new Error('Product exceeds selected risk tolerance');
            return {type:'investment',productId:p.id,sourceId:val('funding',eligibleCny[0].id),direction:val('direction','buy') as 'buy'|'redeem',amountMinor:parseMajorAmount(val('investmentAmount','1000.00'),'CNY')};
          })}>Review order</button>
        </div></Panel>
        <Panel title="Current holdings">{snapshot.holdings.map(h=><p className="mt-3 flex justify-between gap-3 text-sm" key={h.id}><span>{snapshot.investmentProducts.find(p=>p.id===h.productId)?.name}</span><strong>{formatMoney(h.simulatedValue)}</strong></p>)}</Panel>
      </div></div>}
    {section==='fx' && <div className="grid gap-5 lg:grid-cols-2"><Panel title="Reference conversion">
      <div className="grid grid-cols-2 gap-3">{[['currency',currency],['target',target]].map(([key,current])=><Label key={key} caption={key==='currency'?'From':'To'}><select className={field} value={current} onChange={e=>set(key,e.target.value)}>{Object.keys(CURRENCY_MINOR_DIGITS).map(c=><option key={c}>{c}</option>)}</select></Label>)}</div>
      <Label caption="Amount"><input inputMode="decimal" className={field} value={val('fxAmount','100.00')} onChange={e=>set('fxAmount',e.target.value)}/></Label>
      {conversion?<div className="mt-5 rounded-xl bg-blue-50 p-4"><p className="text-sm text-blue-800">Illustrative conversion</p><strong className="mt-2 block text-3xl text-blue-950">{formatMoney(conversion.amount)}</strong>
      <p className="mt-2 text-xs text-blue-800">{conversion.source} · {conversion.referenceAt.slice(0,10)}</p></div>:<p role="alert" className="mt-4 text-sm text-amber-800">{conversionError}</p>}
      <p className="mt-4 text-xs text-slate-500">No money or currencies are actually exchanged.</p></Panel>
      <Panel title="Reference rate records">{snapshot.exchangeRates.map(r=><div key={r.id} className="border-b border-slate-100 py-3"><p className="flex justify-between text-sm"><strong>{r.base}/{r.quote}</strong><span className="font-mono">{r.rate}</span></p>
        <p className="mt-1 text-xs text-amber-800">{r.source.toUpperCase()} · {r.provider}</p><p className="mt-1 text-xs text-slate-500">Reference: {r.referenceAt} · retrieved: {r.retrievedAt}</p>
      </div>)}</Panel></div>}
    {section==='planner' && <>
      <div className="grid gap-4 sm:grid-cols-3">{[['Available CNY',formatMoney(runway.available)],['Monthly budget',formatMoney(runway.monthly)],['Projected runway',runway.months===null?'Not finite':runway.months+' months']].map(([n,v])=><div key={n} className={card}><p className="text-sm text-slate-500">{n}</p><p className="mt-2 text-2xl font-bold">{v}</p></div>)}</div>

      <div className="grid gap-5 lg:grid-cols-2"><Panel title="Update monthly budget caps">{snapshot.budgets.filter(b=>b.month===snapshot.asOf.slice(0,7)).map(b=><div key={b.id} className="border-b border-slate-100 py-3">
        <p className="text-sm font-semibold capitalize">{b.category}: {formatMoney(b.limit)} <span className="text-slate-500">· spent {formatMoney(b.actualSpend)}</span></p>
        <div className="mt-2 flex gap-2"><input aria-label={'New '+b.category+' budget'} className={field+' !mt-0'} placeholder="New amount CNY" value={val('budget:'+b.id)} onChange={e=>set('budget:'+b.id,e.target.value)}/>
        <button className={secondary} onClick={()=>submit(()=>({type:'budget',category:b.category,limitMinor:parseMajorAmount(val('budget:'+b.id),'CNY')}))}>Review</button></div>
      </div>)}</Panel>
      <Panel title="Tuition & emergency fund">{snapshot.tuitionObligations.map(t=><div key={t.id} className="mb-5 space-y-2 text-sm">
        <p><strong>{t.institution}</strong> · {t.installment}</p><p>Due {t.dueAt.slice(0,10)} · <span className="capitalize">{t.status}</span></p>
        <p>Outstanding {formatMoney(money(t.amount.amountMinor-t.paidAmount.amountMinor,t.amount.currency))}</p>
        {t.status!=='paid' && eligibleCny[0]&&<button className={button} onClick={()=>submit(()=>({type:'tuition',sourceId:eligibleCny[0].id,tuitionId:t.id}))}>Review tuition payment</button>}
      </div>)}{snapshot.accounts.filter(a=>a.goal).map(a=><div className="rounded-xl bg-blue-50 p-4" key={a.id}><p className="text-sm font-semibold">Emergency fund</p><p className="mt-1 text-sm">{formatMoney(a.balance)} / {formatMoney(a.goal!)}</p>
      <progress className="mt-2 w-full" value={Number(a.balance.amountMinor)} max={Number(a.goal!.amountMinor)}/></div>)}</Panel></div></>}
    {section==='audit' && <Panel title={'Audit events · '+snapshot.auditEvents.length}><ol className="divide-y divide-slate-100">{snapshot.auditEvents.toReversed().map(e=><li key={e.id} className="py-4 text-sm">
      <div className="flex justify-between gap-3"><strong>{e.eventType}</strong><span className="text-xs text-slate-500">{e.occurredAt.slice(0,19)}</span></div>
      <p className="mt-1 text-slate-600">{e.afterSummary&&typeof e.afterSummary==='object'&&!Array.isArray(e.afterSummary)&&'summary'in e.afterSummary?String(e.afterSummary.summary):'Activity recorded'}</p>
      <p className="mt-1 text-xs text-slate-500">Correlation: {e.correlationId} · {e.outcome}</p>
    </li>)}</ol></Panel>}
    {section==='settings' && <div className="grid gap-5 lg:grid-cols-2"><Panel title="Profile and security">
      <p className="text-sm">{snapshot.users[0].profile.displayName} · {snapshot.users[0].profile.institution}</p>

      </Panel>
      <Panel title="Reset data"><p className="text-sm text-slate-600">Resetting removes your activity and restores the starting balances. This cannot be undone.</p>
      <Label caption="Type RESET DEMO"><input className={field} value={val('reset')} onChange={e=>set('reset',e.target.value)}/></Label>
      <button className={button+' mt-4'} onClick={()=>{if(!reset(val('reset')))setError('Type RESET DEMO exactly.');else{set('reset','');setError(null);}}}>Reset data</button></Panel></div>}
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}

  </div>;
}
export function TransfersWorkspace(){return <PageBody section="transfers"/>}
export function CardsWorkspace(){return <PageBody section="cards"/>}
export function SubscriptionsWorkspace(){return <PageBody section="subscriptions"/>}
export function WealthWorkspace(){return <PageBody section="wealth"/>}
export function FxWorkspace(){return <PageBody section="fx"/>}
export function PlannerWorkspace(){return <PageBody section="planner"/>}
export function AuditWorkspace(){return <PageBody section="audit"/>}
export function SettingsWorkspace(){return <PageBody section="settings"/>}

