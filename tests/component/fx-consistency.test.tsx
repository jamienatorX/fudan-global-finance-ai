import {cleanup, render, screen, waitFor, fireEvent} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {DemoProvider} from '../../src/demo/demo-context';
import {FxReferenceProvider} from '../../src/features/fx/fx-reference-context';
import {FxWorkspace} from '../../src/features/fx/fx-workspace';
import {useDemoOverview} from '../../src/features/overview/use-overview';
import {createSeedSnapshot, DEFAULT_SEED_VERSION} from '../../src/demo/seed';
import {getOverviewModel} from '../../src/features/overview/overview-queries';
import {ratesFromQuotes} from '../../src/features/fx/fx-reference-context';
import type {FinancialRepository} from '../../src/domain/financial-repository';
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams()}));
const date=new Date().toISOString().slice(0,10);
const quotes=['CNY','SGD','IDR'].map((currency,i)=>({pair:`USD/${currency}`,rate:[7,1.4,14000][i],date,change:null,previousDate:null}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();});
function Total(){const overview=useDemoOverview();return <output>{overview?.availableCash.amountMinor.toString()}</output>;}
it('values dashboard totals using the ticker snapshot, preserving original balances',async()=>{
  localStorage.clear();
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({provider:'Frankfurter',quotes})));
  const seed=createSeedSnapshot(DEFAULT_SEED_VERSION);
  const valuation={...seed,exchangeRates:ratesFromQuotes(seed.exchangeRates,quotes)};
  const expected=await getOverviewModel({getSnapshot:async()=>valuation} as unknown as FinancialRepository,seed.users[0].id);
  render(<DemoProvider><FxReferenceProvider><Total/></FxReferenceProvider></DemoProvider>);
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent(expected.availableCash.amountMinor.toString()));
  expect(seed.exchangeRates[0].source).toBe('fallback');
});
it('uses shared core pair rates even when the currency catalogue fails, without a false provider outage',async()=>{
  const fetcher=vi.fn(async(input:RequestInfo|URL)=>{
    if(String(input)==='/api/fx/ticker')return Response.json({provider:'Frankfurter',quotes});
    if(String(input)==='/api/fx/currencies')throw new Error('catalogue timeout');
    throw new Error('independent pair request must not be needed');
  });
  vi.stubGlobal('fetch',fetcher);
  render(<DemoProvider><FxReferenceProvider><FxWorkspace/></FxReferenceProvider></DemoProvider>);
  await waitFor(()=>expect(screen.getByText('CNY 700.00')).toBeInTheDocument());
  expect(screen.queryByText(/provider temporarily unavailable|sample rate is shown/i)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('From currency'),{target:{value:'SGD'}});
  await waitFor(()=>expect(screen.getByText('CNY 500.00')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button',{name:'Refresh reference rate'}));
  await waitFor(()=>expect(fetcher.mock.calls.filter(([url])=>url==='/api/fx/ticker')).toHaveLength(2));
  expect(fetcher).toHaveBeenCalledWith('/api/fx/ticker',expect.objectContaining({cache:'no-store'}));
  expect(fetcher.mock.calls.every(([url])=>!String(url).startsWith('/api/fx/rate'))).toBe(true);
});
it('handles identical currencies during a provider outage without labelling it a sample quote',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('offline');}));
  render(<DemoProvider><FxReferenceProvider><FxWorkspace/></FxReferenceProvider></DemoProvider>);
  await waitFor(()=>expect(screen.getByText('Sample rate · not live')).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('To currency'),{target:{value:'USD'}});
  await waitFor(()=>expect(screen.getByText('USD 100.00')).toBeInTheDocument());
  expect(screen.queryByText('Sample rate · not live')).not.toBeInTheDocument();
  expect(screen.queryByText(/sample rate is shown/i)).not.toBeInTheDocument();
});

it('uses the same published valuation for planner available cash',async()=>{
  const {PlannerWorkspace}=await import('../../src/features/demo/scenario-workspaces');
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({provider:'Frankfurter',quotes})));
  const seed=createSeedSnapshot(DEFAULT_SEED_VERSION),valuation={...seed,exchangeRates:ratesFromQuotes(seed.exchangeRates,quotes)};
  const expected=await getOverviewModel({getSnapshot:async()=>valuation} as unknown as FinancialRepository,seed.users[0].id);
  render(<DemoProvider><FxReferenceProvider><PlannerWorkspace/></FxReferenceProvider></DemoProvider>);
  const {formatMoney}=await import('../../src/domain/money');
  await waitFor(()=>expect(screen.getByText(formatMoney(expected.availableCash).replace(/\s/g,' '))).toBeInTheDocument());
});
