'use client';

import { Pause, Play } from 'lucide-react';
import { useState } from 'react';
import { useFxReference } from '../../features/fx/fx-reference-context';
import type { TickerQuote } from '../../features/fx/ticker-quotes';

export function CurrencyTicker() {
  const { quotes, status } = useFxReference();
  const [paused, setPaused] = useState(false);

  const item = (q: TickerQuote) => <span className="fx-ticker-quote" key={q.pair}>
    <span className="fx-ticker-pair">{q.pair}</span>
    <strong>{q.rate.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong>
    <span className={q.change === null || q.change === 0 ? 'fx-flat' : q.change > 0 ? 'fx-up' : 'fx-down'}>
      {q.change === null ? '—' : `${q.change > 0 ? '▲ +' : q.change < 0 ? '▼ −' : '— '}${Math.abs(q.change).toFixed(2)}%`}
    </span>
  </span>;

  return <section className="fx-ticker" aria-label="Currency market ticker">
    <div className="fx-ticker-heading"><span><span className="fx-ticker-dot" /> FX MARKET</span>
      <FxFreshnessLabel /></div>
    <div className="fx-ticker-window">
      {quotes.length ? <>
        <div className="fx-ticker-track" data-paused={paused} aria-hidden="true">
          <div className="fx-ticker-group">{quotes.map(item)}</div><div className="fx-ticker-group">{quotes.map(item)}</div>
        </div>
        <ul className="sr-only" aria-label="Published FX rates">{quotes.map(q => <li key={q.pair}>
          {q.pair}: {q.rate}. {q.change === null ? 'Change unavailable' : `${q.change > 0 ? 'Up' : q.change < 0 ? 'Down' : 'Unchanged'} ${Math.abs(q.change).toFixed(2)} percent`}. Published {q.date}{q.previousDate ? ` compared with ${q.previousDate}` : ''}.
        </li>)}</ul>
      </> : <span className="fx-ticker-status">{status === 'loading' ? 'Loading rates' : 'Rates unavailable'}</span>}
    </div>
    <button type="button" className="fx-ticker-pause" aria-label={paused ? 'Resume currency ticker' : 'Pause currency ticker'} aria-pressed={paused}
      onClick={() => setPaused(p => !p)}>{paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}</button>
  </section>;
}

export function FxFreshnessLabel() {
  const { status, date, provider } = useFxReference();
  return <span aria-live="polite">{status === 'loading' ? 'Loading FX reference rates' : status === 'live' ? `Daily reference · ${date} · ${provider}` : 'Fallback · sandbox reference rates'}</span>;
}
