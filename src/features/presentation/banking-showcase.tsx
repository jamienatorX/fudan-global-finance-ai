'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useDemo } from '../../demo/demo-context';
import { formatMoney, money } from '../../domain/money';
import { projectedRunway } from '../demo/planning-helpers';

const JOURNEY = [
  { title: 'Accounts & balances', href: '/accounts', description: 'See separate CNY, USD, SGD, and IDR accounts while keeping original currencies intact.', proof: 'Account context and fallback FX labels' },
  { title: 'Smart transfers', href: '/transfers', description: 'Move money between your accounts or to saved recipients.', proof: 'Explicit approval, duplicate protection, two-sided transfers' },
  { title: 'Transactions & bills', href: '/transactions', description: 'Search merchant histories, review spending categories, and validate CSV files without importing them.', proof: 'Income/consumption distinction and no-write CSV preview' },
  { title: 'Virtual cards', href: '/cards', description: 'Manage your cards and spending limits.', proof: 'Masked card numbers and human approval' },
  { title: 'Subscriptions', href: '/subscriptions', description: 'Manage recurring payments.', proof: 'One-time cancellation and preserved historic charges' },
  { title: 'Wealth management', href: '/wealth', description: 'Compare investment products and manage your holdings.', proof: 'Risk screening and investment excluded from spending' },
  { title: 'FX & cross-border', href: '/fx', description: 'Compare currency reference rates.', proof: 'Source and reference date, explicit fallback' },
  { title: 'Tuition & budgeting', href: '/planner', description: 'Plan the tuition obligation, adjust category limits, and compute a transparent cash runway.', proof: 'Separate one-time tuition and monthly budget assumptions' },
] as const;

export function BankingShowcase() {
  const {snapshot}=useDemo();
  const [index,setIndex]=useState(0);
  const step=JOURNEY[index];
  const runway=useMemo(()=>projectedRunway(snapshot),[snapshot]);
  const changed= snapshot.auditEvents.filter(e=>e.eventType.startsWith('demo.'));
  const activeSubs=snapshot.subscriptions.filter(s=>s.status==='active');
  const tuitionOutstanding=snapshot.tuitionObligations.filter(t=>t.status!=='paid')
    .reduce((sum,t)=>sum+t.amount.amountMinor-t.paidAmount.amountMinor,0n);
  return <div className="space-y-7 pb-16">
    <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">福 bank</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <div><h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">One financial home for international students</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
          Accounts, payments, and planning—all in one place.
        </p></div>
        <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
          <p className="text-sm text-blue-200">Available cash · CNY</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{formatMoney(runway.available)}</p>
        </div>
      </div>
    </header>
    <section aria-label="Account summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Monthly budget',formatMoney(runway.monthly),'Current capped monthly expense plan'],
        ['Tuition outstanding',formatMoney(money(tuitionOutstanding,'CNY')),'Upcoming payments'],
        ['Active subscriptions',String(activeSubs.length),'Monthly commitments'],
        ['Recent activity',String(changed.length),'Account activity'],
      ].map(([title,value,detail])=><article key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{value}</p>
        <p className="mt-2 text-xs text-slate-500">{detail}</p>
      </article>)}
    </section>
    <section aria-label="Guided product tour" className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-bold">Your banking services</h2>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {JOURNEY.map((item,i)=><button type="button" key={item.href} onClick={()=>setIndex(i)}
             aria-current={index===i?'step':undefined}
             className={'flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors '+(index===i?'border-blue-600 bg-blue-50 text-blue-800':'border-slate-200 text-slate-700 hover:bg-slate-50')}>
            <span className={'grid size-8 shrink-0 place-items-center rounded-lg text-xs '+(index===i?'bg-blue-600 text-white':'bg-slate-100 text-slate-700')}>{i+1}</span>{item.title}
          </button>)}
        </div>
      </div>
      <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Service {index+1} of {JOURNEY.length}</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-950">{step.title}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">{step.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
          <Link href={step.href} className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">Open service →</Link>
          <button type="button" onClick={()=>setIndex((index+1)%JOURNEY.length)} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Next service</button>
        </div>
      </div>
    </section>

  </div>;
}

