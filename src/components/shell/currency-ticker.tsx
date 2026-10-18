'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TickerQuote } from '../../features/fx/ticker-quotes';

export function CurrencyTicker() {
  const [quotes, setQuotes] = useState<TickerQuote[]>([]);
  const [status, setStatus] = useState('Loading rates');
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch('/api/fx/ticker', { signal: controller.signal });
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json() as { quotes?: TickerQuote[] };
        const valid = (data.quotes ?? []).filter(q => /^USD\/[A-Z]{3}$/.test(q.pair) &&
          Number.isFinite(q.rate) && q.rate > 0 && (q.change === null || Number.isFinite(q.change)) && /^\d{4}-\d{2}-\d{2}$/.test(q.date));
        if (!valid.length) throw new Error('Unavailable');
        if (!controller.signal.aborted) { setQuotes(valid); setStatus(''); }
      } catch {
        if (!controller.signal.aborted) { setQuotes([]); setStatus('Rates unavailable'); }
      }
    }
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 300_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);

  const item = (q: TickerQuote) => <span className="fx-ticker-quote" key={q.pair}>
    <span className="fx-ticker-pair">{q.pair}</span>
    <strong>{q.rate.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong>
    <span className={q.change === null || q.change === 0 ? 'fx-flat' : q.change > 0 ? 'fx-up' : 'fx-down'}>
      {q.change === null ? '—' : `${q.change > 0 ? '▲ +' : q.change < 0 ? '▼ −' : '— '}${Math.abs(q.change).toFixed(2)}%`}
    </span>
  </span>;

  return <section className="fx-ticker" aria-label="Currency market ticker">
    <div className="fx-ticker-heading"><span><span className="fx-ticker-dot" /> FX MARKET</span>
      <span>DAILY{quotes[0] ? ` · ${quotes[0].date}` : ''}</span></div>
    <div className="fx-ticker-window">
      {quotes.length ? <>
        <div className="fx-ticker-track" data-paused={paused} aria-hidden="true">
          <div className="fx-ticker-group">{quotes.map(item)}</div><div className="fx-ticker-group">{quotes.map(item)}</div>
        </div>
        <ul className="sr-only" aria-label="Published FX rates">{quotes.map(q => <li key={q.pair}>
          {q.pair}: {q.rate}. {q.change === null ? 'Change unavailable' : `${q.change > 0 ? 'Up' : q.change < 0 ? 'Down' : 'Unchanged'} ${Math.abs(q.change).toFixed(2)} percent`}. Published {q.date}{q.previousDate ? ` compared with ${q.previousDate}` : ''}.
        </li>)}</ul>
      </> : <span className="fx-ticker-status">{status}</span>}
    </div>
    <button type="button" className="fx-ticker-pause" aria-label={paused ? 'Resume currency ticker' : 'Pause currency ticker'} aria-pressed={paused}
      onClick={() => setPaused(p => !p)}>{paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}</button>
  </section>;
}
