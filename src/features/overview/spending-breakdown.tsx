import { AccountLink as Link } from '../../components/shell/account-link';
import { Card, CardHeader } from '../../components/ui/card';
import { formatMoney } from '../../domain/money';
import type { OverviewModel } from './overview-queries';

const CATEGORY_COLORS: Record<string, string> = {
  rent: 'var(--color-chart-rent)', food: 'var(--color-chart-food)',
  transportation: 'var(--color-chart-transportation)', shopping: 'var(--color-chart-shopping)',
  other: 'var(--color-chart-other)',
};

export function SpendingBreakdown({ overview }: Readonly<{ overview: OverviewModel }>) {
  const total = formatMoney(overview.monthlyExpenses);
  const categories = overview.spending.map((item, index, items) => ({
    ...item,
    start: items.slice(0, index).reduce((sum, previous) => sum + previous.shareBasisPoints / 100, 0),
    share: item.shareBasisPoints / 100,
    color: CATEGORY_COLORS[item.category] ?? 'var(--color-chart-other)',
  }));
  return <Card className="spending-breakdown" aria-label="Spending by category">
    <CardHeader title="Spending by category" eyebrow="This month" action={<Link href="/transactions" className="text-xs font-semibold text-[var(--color-primary)]">View analysis</Link>} />
    <div className="spending-breakdown-body">
      <div className="spending-ring" role="img" aria-label={`Spending category chart. Total ${total}`}>
        <svg viewBox="0 0 320 320" aria-hidden="true">
          <circle cx="160" cy="160" r="130" className="spending-ring-track" />
          {categories.filter(item => item.share > 0).map(item => {
            // Gaps shrink with small categories so a real nonzero share stays visible.
            const gap = Math.min(1.2, item.share * .2);
            return <circle key={item.category} cx="160" cy="160" r="130" pathLength="100"
              fill="none" stroke={item.color} strokeWidth="38"
              strokeDasharray={`${item.share - gap} ${100 - item.share + gap}`}
              strokeDashoffset={-item.start - gap / 2} transform="rotate(-90 160 160)" />;
          })}
        </svg>
        <div className="spending-ring-center"><span>Total spent</span><strong>{total}</strong><small>This month</small></div>
      </div>
      {categories.length ? <ul className="spending-category-grid" aria-label="Category amounts">
        {categories.map(item => <li key={item.category}>
          <span className="spending-category-label"><i style={{ backgroundColor: item.color }} aria-hidden="true" />{item.category}</span>
          <strong>{formatMoney(item.amount)}</strong>
          <span className="spending-category-share">{Number(item.share.toFixed(1))}% of spending</span>
        </li>)}
      </ul> : <p className="spending-empty">No spending recorded this month.</p>}
    </div>
  </Card>;
}
