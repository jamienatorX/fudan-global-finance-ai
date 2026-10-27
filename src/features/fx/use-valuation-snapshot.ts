'use client';
import {useMemo} from 'react';
import {useDemo} from '../../demo/demo-context';
import {ratesFromQuotes, useFxReference} from './fx-reference-context';

/** Read-only display valuation; stored balances and ledger accounting references stay intact. */
export function useValuationSnapshot() {
  const {snapshot} = useDemo();
  const {quotes} = useFxReference();
  return useMemo(() => ({...snapshot, exchangeRates: ratesFromQuotes(snapshot.exchangeRates, quotes)}), [snapshot, quotes]);
}
