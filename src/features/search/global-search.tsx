'use client';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState, type KeyboardEvent, type FormEvent } from 'react';
import { useOptionalDemo } from '../../demo/demo-context';
import { indexDemoBanking, searchBankingRecords, type BankingSearchResult } from './banking-search';

export function GlobalSearch({ accounts }: Readonly<{ accounts: readonly { id: string; label: string }[] }>) {
  const demo = useOptionalDemo();
  const searchParams = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const index = useMemo(() => demo ? indexDemoBanking(demo.snapshot) :
    accounts.map(a => ({
      id: 'account:' + a.id, category: 'Accounts' as const, title: a.label,
      detail: 'Banking account', href: '/accounts?account=' + encodeURIComponent(a.id),
      keywords: ('accounts ' + a.label).toLocaleLowerCase(),
    })), [demo, accounts]);
  const results = useMemo(() => searchBankingRecords(index, value), [index, value]);
  const term = value.trim();
  const listId = 'banking-search-results';
  const visible = open && Boolean(term);
  const ref = useRef<HTMLDivElement>(null);
  function choose(item: BankingSearchResult) {
    const params = new URLSearchParams(item.href.split('?')[1] ?? '');
    const account = searchParams.get('account');
    if (account && !params.has('account')) params.set('account', account);
    const target = item.href.split('?')[0] + (params.size ? '?' + params.toString() : '');
    router.push(target);
    setOpen(false);
    setValue('');
    setSelected(0);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (results[0]) choose(results[Math.min(selected, results.length - 1)]);
    else if (term) {
      router.push('/transactions?q=' + encodeURIComponent(term));
      setOpen(false);
    }
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setSelected(current => results.length ? (current + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : 0);
    }
  }
  return <div ref={ref} className="relative w-full max-w-lg">
    <form role="search" aria-label="Global banking search" onSubmit={submit}>
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <Search size={17} className="shrink-0 text-slate-500" aria-hidden />
        <input type="search" aria-label="Search banking" aria-autocomplete="list" aria-controls={listId} aria-expanded={visible}
          aria-activedescendant={visible && results[selected] ? 'bank-result-' + results[selected].id : undefined}
          className="w-full min-w-0 bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500"
          placeholder="Search payments, merchants, cards…" value={value}
          onChange={e => { setValue(e.target.value); setOpen(true); setSelected(0); }}
          onFocus={() => { if (term) setOpen(true); }}
          onKeyDown={keyDown}
          onBlur={e => {
            if (!ref.current?.contains(e.relatedTarget)) setOpen(false);
          }}
        />
        {term ? <button aria-label="Clear banking search" type="button" onClick={() => { setValue(''); setOpen(false); setSelected(0); }} className="rounded-md p-1 text-slate-600 hover:bg-slate-200"><X size={16} aria-hidden /></button> : null}
        <button type="submit" className="sr-only">Search</button>
      </div>
    </form>
    {visible ? <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(26rem,65vh)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl" id={listId} role="listbox" aria-label="Banking search results">
      <p className="px-3 py-2 text-xs text-slate-500">{results.length ? 'Matching records · choose to open' : 'No matching records found'}</p>
      {results.map((r,i) => <button type="button" role="option" aria-selected={i===selected}
        id={'bank-result-'+r.id} key={r.id}
        onMouseDown={e=>e.preventDefault()} onClick={() => choose(r)}
        className={'flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left hover:bg-blue-50 '+(selected===i?'bg-blue-50':'')}>
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{r.title}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-600">{r.category} · {r.detail}</span></span>
        <ArrowUpRight size={17} className="shrink-0 text-blue-600" aria-hidden />
      </button>)}
      {results.length===0 ? <p className="px-3 pb-2 text-xs text-slate-500">Try a merchant, amount, category, currency, or account type.</p> : null}
    </div> : null}
    {path==='/overview' ? <span className="sr-only">Search your accounts and activity.</span> : null}
  </div>;
}

