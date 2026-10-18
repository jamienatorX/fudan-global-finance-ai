import { AccountLink as Link } from '../../../src/components/shell/account-link';
import { ArrowLeft, Construction } from 'lucide-react';
import { notFound } from 'next/navigation';

const SECTIONS: Readonly<Record<string, Readonly<{ title: string; description: string; phase: string }>>> = {
  accounts: { title: 'Accounts & Balances', description: 'Multi-currency accounts, details, and balance history.', phase: 'Phase 2' },
  transfers: { title: 'Smart Transfers', description: 'Approval-gated transfers, schedules, receipts, and history.', phase: 'Phase 2' },
  transactions: { title: 'Transactions & Bill Analysis', description: 'Categorization, trends, anomalies, and reports.', phase: 'Phase 2' },
  wealth: { title: 'Wealth Management', description: 'Products, holdings, and orders.', phase: 'Phase 3' },
  cards: { title: 'Card Management', description: 'Virtual cards, security controls, limits, and restrictions.', phase: 'Phase 3' },
  subscriptions: { title: 'Subscription Management', description: 'Recurring payments and renewals.', phase: 'Phase 3' },
  fx: { title: 'Currency Exchange & Cross-Border', description: 'Reference FX, conversion, and remittance planning.', phase: 'Phase 5' },
  planner: { title: 'Budget & Tuition Planner', description: 'Living budgets, tuition, allowance planning, and cash runway.', phase: 'Phase 5' },
  audit: { title: 'Notifications & Audit Trail', description: 'Approval history, financial changes, failures, and receipts.', phase: 'Phase 4' },
  settings: { title: 'Settings & Security', description: 'Profile, security, data sources, and demo controls.', phase: 'Phase 4' },
};

export default async function ProductSectionPage({ params }: Readonly<{ params: Promise<{ section: string }> }>) {
  const { section } = await params;
  const page = SECTIONS[section];
  if (!page) notFound();
  return (
    <div className="grid min-h-[65vh] place-items-center py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[var(--shadow-card)] sm:p-12">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Construction size={26} aria-hidden /></span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">Not available yet</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{page.title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">{page.description}</p>
        <Link href="/overview" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><ArrowLeft size={16} aria-hidden />Back to overview</Link>
      </section>
    </div>
  );
}

