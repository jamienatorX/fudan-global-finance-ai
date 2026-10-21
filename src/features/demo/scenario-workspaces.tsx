'use client';
import { LocalizedButton, LocalizedDiv, LocalizedH1, LocalizedH2, LocalizedHeader, LocalizedInput, LocalizedLabel, LocalizedLi, LocalizedOl, LocalizedOption, LocalizedP, LocalizedProgress, LocalizedSection, LocalizedSelect, LocalizedSpan, LocalizedStrong } from '../../i18n/localized';
import { useState, type ReactNode } from 'react';
import { useShanghaiDate } from '../cards/use-shanghai-date';
import { CardReminders } from '../cards/card-reminders';
import { useDemo } from '../../demo/demo-context';
import type { DemoAction } from '../../demo/demo-engine';
import type { CurrencyCode } from '../../domain/currency';
import { CURRENCY_MINOR_DIGITS } from '../../domain/currency';
import { formatMoney, money } from '../../domain/money';
import { parseMajorAmount, referenceConversion, projectedRunway } from './planning-helpers';

type TransferDefaults = { sourceId?: string; destinationId?: string; internalOnly?: boolean };
type Page = 'transfers' | 'cards' | 'subscriptions' | 'wealth' | 'fx' | 'planner' | 'audit' | 'settings';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const field = 'mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-2 focus:outline-blue-500';
const button = 'rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700';
const secondary = 'rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50';
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <LocalizedSection className={card}><LocalizedH2 className="mb-4 text-lg font-semibold text-slate-950">{title}</LocalizedH2>{children}</LocalizedSection>;
}
function Label({ caption, children }: { caption: string; children: ReactNode }) {
  return <LocalizedLabel className="block text-sm font-medium text-slate-700">{caption}{children}</LocalizedLabel>;
}
function PageBody({ section, transferDefaults }: { section: Page; transferDefaults?: TransferDefaults }) {
  const { snapshot, request, reset } = useDemo();
  const today=useShanghaiDate();
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
  const defaultSource=snapshot.accounts.find(a=>a.id===transferDefaults?.sourceId && a.ownerId===snapshot.users[0].id && a.status==='active') ?? snapshot.accounts[0];
  const defaultDestination=snapshot.accounts.find(a=>a.id===transferDefaults?.destinationId && a.ownerId===snapshot.users[0].id && a.id!==defaultSource.id && a.status==='active' && a.currency===defaultSource.currency);
  const accountId=val('source',defaultSource.id);
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
  return <LocalizedDiv className="space-y-6">
    <LocalizedHeader>
      <LocalizedH1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{title}</LocalizedH1>
      <LocalizedP className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</LocalizedP></LocalizedHeader>
    {section==='transfers' && <LocalizedDiv id="between-accounts" className="grid gap-5 lg:grid-cols-2">
      <Panel title={transferDefaults?.internalOnly?'Transfer between your accounts':'Create a transfer proposal'}>
        <LocalizedDiv className="space-y-4">
          <Label caption="Source account"><LocalizedSelect aria-label="Source account" className={field} value={accountId} onChange={e=>{set('source',e.target.value);set('recipient','');}}>
            {snapshot.accounts.filter(a=>a.status==='active').map(a=><LocalizedOption key={a.id} value={a.id}>{a.currency} {a.type} · {formatMoney(a.availableBalance)}</LocalizedOption>)}</LocalizedSelect></Label>
          <Label caption="Recipient"><LocalizedSelect aria-label="Recipient" className={field} value={val('recipient',defaultDestination?'account:'+defaultDestination.id:'')} onChange={e=>set('recipient',e.target.value)}>
            <LocalizedOption value="">Choose a recipient</LocalizedOption>
            {snapshot.accounts.filter(a=>a.id!==source.id&&a.currency===source.currency).map(a=><LocalizedOption key={a.id} value={'account:'+a.id}>Own {a.currency} {a.type}</LocalizedOption>)}
            {!transferDefaults?.internalOnly && snapshot.beneficiaries.filter(b=>b.supportedCurrencies.includes(source.currency)).map(b=><LocalizedOption key={b.id} value={'beneficiary:'+b.id}>{b.displayName} · {b.accountAlias}</LocalizedOption>)}
          </LocalizedSelect></Label>
          <Label caption={'Amount ('+source.currency+')'}><LocalizedInput className={field} inputMode="decimal" value={val('transferAmount','800.00')} onChange={e=>set('transferAmount',e.target.value)}/></Label>
          <Label caption="Optional schedule (Shanghai UTC+08:00)"><LocalizedInput type="datetime-local" className={field} value={val('schedule')} onChange={e=>set('schedule',e.target.value)}/></Label>
          <LocalizedButton className={button} onClick={()=>submit(()=>{
            const recipient=val('recipient',defaultDestination?'account:'+defaultDestination.id:''); if(!recipient)throw new Error('Select a recipient');
            const scheduledAt=val('schedule')?new Date(val('schedule')+':00+08:00').toISOString():undefined;
            return {type:'transfer',sourceId:source.id,amountMinor:parseMajorAmount(val('transferAmount','800.00'),source.currency),scheduledAt,
              ...(recipient.startsWith('account:')?{destinationId:recipient.slice(8)}:{beneficiaryId:recipient.slice(12)})};
          })}>Review transfer</LocalizedButton>
        </LocalizedDiv></Panel>
      <Panel title="Transfer history">{snapshot.transfers.toReversed().slice(0,12).map(t=><LocalizedDiv key={t.id} className="border-b border-slate-100 py-3 text-sm">
        <LocalizedDiv className="flex justify-between"><LocalizedStrong>{formatMoney(t.amount)}</LocalizedStrong><LocalizedSpan className="capitalize">{t.status}</LocalizedSpan></LocalizedDiv>
        <LocalizedP className="mt-1 text-xs text-slate-500">{t.receiptRef} · {t.scheduledAt ? t.scheduledAt.slice(0,16)+' UTC' : 'Completed'}</LocalizedP>
      </LocalizedDiv>)}</Panel></LocalizedDiv>}
    {section==='cards' && <LocalizedDiv className="grid gap-5 md:grid-cols-2">{snapshot.cards.map(c=><Panel key={c.id} title={c.purpose.replaceAll('-',' ')+' virtual card'}>
      <LocalizedDiv className="rounded-2xl bg-gradient-to-br from-slate-950 to-blue-800 p-6 text-white">
        <LocalizedP className="text-sm font-semibold">福 Bank</LocalizedP><LocalizedP className="mt-12 font-mono text-2xl tracking-widest">{c.maskedNumber}</LocalizedP>
        <LocalizedP className="mt-3 text-sm capitalize">{c.freezeState}</LocalizedP>
      </LocalizedDiv><LocalizedP className="mt-4 text-sm">Daily limit: {formatMoney(c.dailyLimit)}</LocalizedP><LocalizedP className="mt-1 text-sm">Monthly limit: {formatMoney(c.monthlyLimit)}</LocalizedP>
      <LocalizedDiv className="mt-4"><LocalizedButton className={button} onClick={()=>submit(()=>({type:'card',cardId:c.id,mode:c.freezeState==='frozen'?'unfreeze':'freeze'}))}>{c.freezeState==='frozen'?'Review unfreeze':'Review freeze'}</LocalizedButton></LocalizedDiv>
      <LocalizedDiv className="mt-4"><Label caption="Change monthly limit (CNY)"><LocalizedInput className={field} value={val('limit:'+c.id)} placeholder="1000.00" onChange={e=>set('limit:'+c.id,e.target.value)}/></Label>
      <LocalizedButton className={secondary+' mt-2'} onClick={()=>submit(()=>({type:'card',cardId:c.id,mode:'limit',limitMinor:parseMajorAmount(val('limit:'+c.id),'CNY')}))}>Review limit change</LocalizedButton></LocalizedDiv>
    </Panel>)}</LocalizedDiv>}
    {section==='cards' && <LocalizedDiv id="reminders"><CardReminders /></LocalizedDiv>}
    {section==='subscriptions' && <>
      <Panel title="Recurring commitments"><LocalizedP className="text-3xl font-bold">{formatMoney(money(totalSubscriptions,'CNY'))} <LocalizedSpan className="text-sm font-normal text-slate-500">/ month</LocalizedSpan></LocalizedP>
      <LocalizedP className="mt-2 text-xs text-slate-500">Annualized estimate: {formatMoney(money(totalSubscriptions*12n,'CNY'))}.</LocalizedP><LocalizedP className="mt-2 text-xs text-slate-500">Illustrative membership charges, not current retail prices. No provider connection.</LocalizedP></Panel>
      <LocalizedDiv className="grid gap-5 md:grid-cols-2">{snapshot.subscriptions.map(s=><Panel key={s.id} title={s.merchant}>
        <LocalizedDiv className="flex justify-between gap-2"><LocalizedStrong className="text-xl">{formatMoney(s.amount)} / {s.cadence}</LocalizedStrong><LocalizedSpan className="capitalize text-slate-500">{s.status}</LocalizedSpan></LocalizedDiv>
        <LocalizedP className="mt-3 text-sm text-slate-600">Renewal: {s.nextRenewalAt.slice(0,10)}</LocalizedP>
        <LocalizedP className="mt-1 text-sm text-slate-600">{s.lastUsageAt?'Last used: '+s.lastUsageAt.slice(0,10):'No recorded usage'}</LocalizedP>
        {s.status==='active'&&!s.lastUsageAt&&s.insightDecision!=='kept'&&!(s.insightDecision==='snoozed'&&(s.insightSnoozedUntil?.slice(0,10)??'')>(today||snapshot.asOf.slice(0,10)))?<LocalizedDiv className="student-insight"><LocalizedP>{s.merchant} has no recorded usage.</LocalizedP><LocalizedDiv className="student-toggle">{(['cancel','snooze','keep'] as const).map(mode=><LocalizedButton key={mode} onClick={()=>submit(()=>({type:'subscription',subscriptionId:s.id,mode}))}>{mode==='cancel'?'Cancel':mode==='snooze'?'Snooze 30 days':'Keep'}</LocalizedButton>)}</LocalizedDiv></LocalizedDiv>:null}
        {s.insightDecision?<LocalizedP className="student-note">Insight: {s.insightDecision}{s.insightDecision==='snoozed'?' until '+s.insightSnoozedUntil?.slice(0,10):''}</LocalizedP>:null}
        {s.status==='active'&&<LocalizedButton className={button+' mt-4'} onClick={()=>submit(()=>({type:'subscription',subscriptionId:s.id}))}>Review cancellation</LocalizedButton>}
      </Panel>)}</LocalizedDiv></>}
    {section==='wealth' && <LocalizedDiv className="grid gap-5 lg:grid-cols-2">
      <LocalizedDiv className="space-y-4"><Panel title="Risk preference"><LocalizedSelect className={field} value={val('risk','low')} onChange={e=>set('risk',e.target.value)}><LocalizedOption value="low">Low</LocalizedOption><LocalizedOption value="medium">Medium</LocalizedOption><LocalizedOption value="high">High</LocalizedOption></LocalizedSelect></Panel>
      {snapshot.investmentProducts.filter(p=>!p.id.startsWith('market:')).map(p=><Panel key={p.id} title={p.name}>
        <LocalizedP className="text-sm text-slate-600">{p.category.replaceAll('-',' ')} · {p.simulatedRisk} risk · fee {(p.feeBasisPoints/100).toFixed(2)}% · {p.liquidity}</LocalizedP>
        <LocalizedP className="mt-2 text-xs text-slate-500">Illustrative return {(p.historicalSimulation.returnBasisPoints/100).toFixed(2)}%; drawdown {(p.historicalSimulation.drawdownBasisPoints/100).toFixed(2)}%. No guaranteed returns.</LocalizedP>
        <LocalizedButton className={secondary+' mt-3'} onClick={()=>set('product',p.id)}>Select product</LocalizedButton>
      </Panel>)}</LocalizedDiv>
      <LocalizedDiv className="space-y-4"><Panel title="Investment order">
        <LocalizedDiv className="space-y-3">
          <Label caption="Product"><LocalizedSelect className={field} value={val('product',snapshot.investmentProducts[0].id)} onChange={e=>set('product',e.target.value)}>{snapshot.investmentProducts.filter(p=>!p.id.startsWith('market:')).map(p=><LocalizedOption value={p.id} key={p.id}>{p.name}</LocalizedOption>)}</LocalizedSelect></Label>
          <Label caption="Order direction"><LocalizedSelect className={field} value={val('direction','buy')} onChange={e=>set('direction',e.target.value)}><LocalizedOption value="buy">Buy</LocalizedOption><LocalizedOption value="redeem">Redeem</LocalizedOption></LocalizedSelect></Label>
          <Label caption="Funding account"><LocalizedSelect className={field} value={val('funding',eligibleCny[0].id)} onChange={e=>set('funding',e.target.value)}>{eligibleCny.map(a=><LocalizedOption key={a.id} value={a.id}>{a.type} · {formatMoney(a.availableBalance)}</LocalizedOption>)}</LocalizedSelect></Label>
          <Label caption="Amount CNY"><LocalizedInput className={field} inputMode="decimal" value={val('investmentAmount','1000.00')} onChange={e=>set('investmentAmount',e.target.value)}/></Label>
          <LocalizedButton className={button} onClick={()=>submit(()=>{
            const p=snapshot.investmentProducts.find(p=>p.id===val('product',snapshot.investmentProducts[0].id))!;
            const ranks={low:0,medium:1,high:2};
            if(val('direction','buy')==='buy' && ranks[p.simulatedRisk]>ranks[val('risk','low') as keyof typeof ranks])throw new Error('Product exceeds selected risk tolerance');
            return {type:'investment',productId:p.id,sourceId:val('funding',eligibleCny[0].id),direction:val('direction','buy') as 'buy'|'redeem',amountMinor:parseMajorAmount(val('investmentAmount','1000.00'),'CNY')};
          })}>Review order</LocalizedButton>
        </LocalizedDiv></Panel>
        <Panel title="Current holdings">{snapshot.holdings.map(h=><LocalizedP className="mt-3 flex justify-between gap-3 text-sm" key={h.id}><LocalizedSpan>{snapshot.investmentProducts.find(p=>p.id===h.productId)?.name}</LocalizedSpan><LocalizedStrong>{formatMoney(h.simulatedValue)}</LocalizedStrong></LocalizedP>)}</Panel>
      </LocalizedDiv></LocalizedDiv>}
    {section==='fx' && <LocalizedDiv className="grid gap-5 lg:grid-cols-2"><Panel title="Reference conversion">
      <LocalizedDiv className="grid grid-cols-2 gap-3">{[['currency',currency],['target',target]].map(([key,current])=><Label key={key} caption={key==='currency'?'From':'To'}><LocalizedSelect className={field} value={current} onChange={e=>set(key,e.target.value)}>{Object.keys(CURRENCY_MINOR_DIGITS).map(c=><LocalizedOption key={c}>{c}</LocalizedOption>)}</LocalizedSelect></Label>)}</LocalizedDiv>
      <Label caption="Amount"><LocalizedInput inputMode="decimal" className={field} value={val('fxAmount','100.00')} onChange={e=>set('fxAmount',e.target.value)}/></Label>
      {conversion?<LocalizedDiv className="mt-5 rounded-xl bg-blue-50 p-4"><LocalizedP className="text-sm text-blue-800">Illustrative conversion</LocalizedP><LocalizedStrong className="mt-2 block text-3xl text-blue-950">{formatMoney(conversion.amount)}</LocalizedStrong>
      <LocalizedP className="mt-2 text-xs text-blue-800">{conversion.source} · {conversion.referenceAt.slice(0,10)}</LocalizedP></LocalizedDiv>:<LocalizedP role="alert" className="mt-4 text-sm text-amber-800">{conversionError}</LocalizedP>}
      <LocalizedP className="mt-4 text-xs text-slate-500">No money or currencies are actually exchanged.</LocalizedP></Panel>
      <Panel title="Reference rate records">{snapshot.exchangeRates.map(r=><LocalizedDiv key={r.id} className="border-b border-slate-100 py-3"><LocalizedP className="flex justify-between text-sm"><LocalizedStrong>{r.base}/{r.quote}</LocalizedStrong><LocalizedSpan className="font-mono">{r.rate}</LocalizedSpan></LocalizedP>
        <LocalizedP className="mt-1 text-xs text-amber-800">{r.source.toUpperCase()} · {r.provider}</LocalizedP><LocalizedP className="mt-1 text-xs text-slate-500">Reference: {r.referenceAt} · retrieved: {r.retrievedAt}</LocalizedP>
      </LocalizedDiv>)}</Panel></LocalizedDiv>}
    {section==='planner' && <>
      <LocalizedDiv className="grid gap-4 sm:grid-cols-3">{[['Available CNY',formatMoney(runway.available)],['Monthly budget',formatMoney(runway.monthly)],['Projected runway',runway.months===null?'Not finite':runway.months+' months']].map(([n,v])=><LocalizedDiv key={n} className={card}><LocalizedP className="text-sm text-slate-500">{n}</LocalizedP><LocalizedP className="mt-2 text-2xl font-bold">{v}</LocalizedP></LocalizedDiv>)}</LocalizedDiv>

      <LocalizedDiv className="grid gap-5 lg:grid-cols-2"><Panel title="Update monthly budget caps">{snapshot.budgets.filter(b=>b.month===snapshot.asOf.slice(0,7)).map(b=><LocalizedDiv key={b.id} className="border-b border-slate-100 py-3">
        <LocalizedP className="text-sm font-semibold capitalize">{b.category}: {formatMoney(b.limit)} <LocalizedSpan className="text-slate-500">· spent {formatMoney(b.actualSpend)}</LocalizedSpan></LocalizedP>
        <LocalizedDiv className="mt-2 flex gap-2"><LocalizedInput aria-label={'New '+b.category+' budget'} className={field+' !mt-0'} placeholder="New amount CNY" value={val('budget:'+b.id)} onChange={e=>set('budget:'+b.id,e.target.value)}/>
        <LocalizedButton className={secondary} onClick={()=>submit(()=>({type:'budget',category:b.category,limitMinor:parseMajorAmount(val('budget:'+b.id),'CNY')}))}>Review</LocalizedButton></LocalizedDiv>
      </LocalizedDiv>)}</Panel>
      <Panel title="Tuition & emergency fund">{snapshot.tuitionObligations.map(t=><LocalizedDiv key={t.id} className="mb-5 space-y-2 text-sm">
        <LocalizedP><LocalizedStrong>{t.institution}</LocalizedStrong> · {t.installment}</LocalizedP><LocalizedP>Due {t.dueAt.slice(0,10)} · <LocalizedSpan className="capitalize">{t.status!=='paid' && t.amount.amountMinor>t.paidAmount.amountMinor && t.dueAt.slice(0,10)<(today||snapshot.asOf.slice(0,10))?'Overdue':t.status}</LocalizedSpan></LocalizedP>
        <LocalizedP>Outstanding {formatMoney(money(t.amount.amountMinor-t.paidAmount.amountMinor,t.amount.currency))}</LocalizedP>
        {t.status!=='paid' && eligibleCny[0]&&<LocalizedButton className={button} onClick={()=>submit(()=>({type:'tuition',sourceId:eligibleCny[0].id,tuitionId:t.id}))}>Review tuition payment</LocalizedButton>}
      </LocalizedDiv>)}{snapshot.accounts.filter(a=>a.goal).map(a=><LocalizedDiv className="rounded-xl bg-blue-50 p-4" key={a.id}><LocalizedP className="text-sm font-semibold">Emergency fund</LocalizedP><LocalizedP className="mt-1 text-sm">{formatMoney(a.balance)} / {formatMoney(a.goal!)}</LocalizedP>
      <LocalizedProgress className="mt-2 w-full" value={Number(a.balance.amountMinor)} max={Number(a.goal!.amountMinor)}/></LocalizedDiv>)}</Panel></LocalizedDiv></>}
    {section==='audit' && <Panel title={'Audit events · '+snapshot.auditEvents.length}><LocalizedOl className="divide-y divide-slate-100">{snapshot.auditEvents.toReversed().map(e=><LocalizedLi key={e.id} className="py-4 text-sm">
      <LocalizedDiv className="flex justify-between gap-3"><LocalizedStrong>{e.eventType}</LocalizedStrong><LocalizedSpan className="text-xs text-slate-500">{e.occurredAt.slice(0,19)}</LocalizedSpan></LocalizedDiv>
      <LocalizedP className="mt-1 text-slate-600">{e.afterSummary&&typeof e.afterSummary==='object'&&!Array.isArray(e.afterSummary)&&'summary'in e.afterSummary?String(e.afterSummary.summary):'Activity recorded'}</LocalizedP>
      <LocalizedP className="mt-1 text-xs text-slate-500">Correlation: {e.correlationId} · {e.outcome}</LocalizedP>
    </LocalizedLi>)}</LocalizedOl></Panel>}
    {section==='settings' && <LocalizedDiv className="grid gap-5 lg:grid-cols-2"><Panel title="Profile and security">
      <LocalizedP className="text-sm">{snapshot.users[0].profile.displayName} · {snapshot.users[0].profile.institution}</LocalizedP>

      </Panel>
      <Panel title="Reset data"><LocalizedP className="text-sm text-slate-600">Resetting removes your activity and restores the starting balances. This cannot be undone.</LocalizedP>
      <Label caption="Type RESET DEMO"><LocalizedInput className={field} value={val('reset')} onChange={e=>set('reset',e.target.value)}/></Label>
      <LocalizedButton className={button+' mt-4'} onClick={()=>{if(!reset(val('reset')))setError('Type RESET DEMO exactly.');else{set('reset','');setError(null);}}}>Reset data</LocalizedButton></Panel></LocalizedDiv>}
    {error&&<LocalizedP role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</LocalizedP>}

  </LocalizedDiv>;
}
export function TransfersWorkspace(props: TransferDefaults){return <PageBody key={(props.sourceId??'')+':'+(props.destinationId??'')+':'+!!props.internalOnly} section="transfers" transferDefaults={props}/>}
export function CardsWorkspace(){return <PageBody section="cards"/>}
export function SubscriptionsWorkspace(){return <PageBody section="subscriptions"/>}
export function WealthWorkspace(){return <PageBody section="wealth"/>}
export function FxWorkspace(){return <PageBody section="fx"/>}
export function PlannerWorkspace(){return <PageBody section="planner"/>}
export function AuditWorkspace(){return <PageBody section="audit"/>}
export function SettingsWorkspace(){return <PageBody section="settings"/>}

