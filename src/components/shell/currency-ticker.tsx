'use client';

import { LocalizedButton, LocalizedDiv, LocalizedLi, LocalizedSection, LocalizedSpan, LocalizedStrong, LocalizedUl } from '../../i18n/localized';
import { Pause, Play } from 'lucide-react';
import { useState } from 'react';
import { useFxReference } from '../../features/fx/fx-reference-context';
import type { TickerQuote } from '../../features/fx/ticker-quotes';

export function CurrencyTicker() {
  const { quotes, status } = useFxReference();
  const [paused, setPaused] = useState(false);

  const item = (q: TickerQuote) => <LocalizedSpan className="fx-ticker-quote" key={q.pair}>
    <LocalizedSpan className="fx-ticker-pair">{q.pair}</LocalizedSpan>
    <LocalizedStrong>{q.rate.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</LocalizedStrong>
    <LocalizedSpan className={q.change === null || q.change === 0 ? 'fx-flat' : q.change > 0 ? 'fx-up' : 'fx-down'}>
      {q.change === null ? '—' : `${q.change > 0 ? '▲ +' : q.change < 0 ? '▼ −' : '— '}${Math.abs(q.change).toFixed(2)}%`}
    </LocalizedSpan>
  </LocalizedSpan>;

  return <LocalizedSection className="fx-ticker" aria-label="Currency market ticker">
    <LocalizedDiv className="fx-ticker-heading"><LocalizedSpan><LocalizedSpan className="fx-ticker-dot" /> FX MARKET</LocalizedSpan>
      <FxFreshnessLabel /></LocalizedDiv>
    <LocalizedDiv className="fx-ticker-window">
      {quotes.length ? <>
        <LocalizedDiv className="fx-ticker-track" data-paused={paused} aria-hidden="true">
          <LocalizedDiv className="fx-ticker-group">{quotes.map(item)}</LocalizedDiv><LocalizedDiv className="fx-ticker-group">{quotes.map(item)}</LocalizedDiv>
        </LocalizedDiv>
        <LocalizedUl className="sr-only" aria-label="Published FX rates">{quotes.map(q => <LocalizedLi key={q.pair}>
          {q.pair}: {q.rate}. {q.change === null ? 'Change unavailable' : `${q.change > 0 ? 'Up' : q.change < 0 ? 'Down' : 'Unchanged'} ${Math.abs(q.change).toFixed(2)} percent`}. Published {q.date}{q.previousDate ? ` compared with ${q.previousDate}` : ''}.
        </LocalizedLi>)}</LocalizedUl>
      </> : <LocalizedSpan className="fx-ticker-status">{status === 'loading' ? 'Loading rates' : 'Rates unavailable'}</LocalizedSpan>}
    </LocalizedDiv>
    <LocalizedButton type="button" className="fx-ticker-pause" aria-label={paused ? 'Resume currency ticker' : 'Pause currency ticker'} aria-pressed={paused}
      onClick={() => setPaused(p => !p)}>{paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}</LocalizedButton>
  </LocalizedSection>;
}

export function FxFreshnessLabel() {
  const { status, date, provider } = useFxReference();
  return <LocalizedSpan aria-live="polite">{status === 'loading' ? 'Loading FX reference rates' : status === 'live' ? `Daily reference · ${date} · ${provider}` : 'Fallback · sandbox reference rates'}</LocalizedSpan>;
}
