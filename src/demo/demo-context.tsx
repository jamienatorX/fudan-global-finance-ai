'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { FinancialSnapshot } from '../domain/entities';
import { fromFinancialSnapshotDTO, toFinancialSnapshotDTO, type FinancialSnapshotDTO } from '../domain/financial-snapshot-dto';
import { createSeedSnapshot, DEFAULT_SEED_VERSION } from './seed';
import { applyDemoAction, runApprovedDemoBatch, type DemoAction, type DemoBatchStep, type DemoResult, type PreparedAction } from './demo-engine';

const STORE = 'fudan-global-finance-ai:simulation:v2';
type DemoState = Readonly<{ snapshot: FinancialSnapshot; version: number }>;
type DemoContextValue = Readonly<{
  snapshot: FinancialSnapshot; version: number;
  pending: PreparedAction | null;
  notice: string | null;
  results: readonly DemoResult[];
  request: (action: DemoAction) => void;
  approve: () => void;
  reject: () => void;
  executeBatch: (steps: readonly DemoBatchStep[], expectedVersion: number, expiresAt: number) => void;
  reset: (confirmation: string) => boolean;
}>;
const Context = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<DemoState>(() => ({ snapshot: createSeedSnapshot(DEFAULT_SEED_VERSION), version: 0 }));
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState<PreparedAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [results, setResults] = useState<readonly DemoResult[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) {
        const saved = JSON.parse(raw) as { snapshot: FinancialSnapshotDTO; version: number };
        if (saved.snapshot?.seedVersion === DEFAULT_SEED_VERSION &&
          Array.isArray(saved.snapshot.accounts) && Array.isArray(saved.snapshot.auditEvents) &&
          Number.isSafeInteger(saved.version) && saved.version >= 0) {
          // Rehydrate only after mount so the server and client render the same seed initially.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setState({ snapshot: fromFinancialSnapshotDTO(saved.snapshot), version: saved.version });
        }
      }
    } catch { /* Corrupt browser-local demos always fall back to the versioned fixture. */ }
    // Mount-time hydration protects the server/client seed agreement.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORE, JSON.stringify({ snapshot: toFinancialSnapshotDTO(state.snapshot), version: state.version })); }
    catch { /* Browser-local persistence is optional; in-memory state still works for this session. */ }
  }, [state, hydrated]);

  const request = useCallback((action: DemoAction) => {
    setPending({ action, id: crypto.randomUUID(), preparedAt: Date.now(), expiresAt: Date.now() + 10 * 60_000, version: state.version });
    setNotice(null);
  }, [state.version]);

  const approve = useCallback(() => {
    if (!pending) return;
    if (Date.now() > pending.expiresAt || state.version !== pending.version) {
      setNotice('This confirmation has expired. Please review the details again.');
      setPending(null); return;
    }
    try {
      const result = applyDemoAction(state.snapshot, pending.action, pending.id);
      setState({ snapshot: result.snapshot, version: state.version + 1 });
      setNotice(result.message);
      setResults([{ id: pending.id, action: pending.action, status: 'executed', message: result.message }]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not complete this action. Please try again.');
      setResults([{ id: pending.id, action: pending.action, status: 'failed', message: error instanceof Error ? error.message : 'Failed' }]);
    }
    setPending(null);
  }, [pending, state]);

  const reject = useCallback(() => { setPending(null); setNotice('Cancelled. No changes were made.'); }, []);

  const executeBatch = useCallback((steps: readonly DemoBatchStep[], expectedVersion: number, expiresAt: number) => {
    if (Date.now() > expiresAt || state.version !== expectedVersion) {
      setNotice('This confirmation has expired. Please review the details again.'); return;
    }
    const outcome = runApprovedDemoBatch(state.snapshot, steps);
    setState({ snapshot: outcome.snapshot, version: state.version + 1 });
    setResults(outcome.results);
    setNotice(outcome.results.map(r => r.status + ': ' + r.message).join(' | '));
    setPending(null);
  }, [state]);

  const reset = useCallback((confirmation: string) => {
    if (confirmation !== 'RESET DEMO') { setNotice('Enter RESET DEMO to confirm.'); return false; }
    const snapshot = createSeedSnapshot(DEFAULT_SEED_VERSION);
    setState({ snapshot, version: state.version + 1 });
    setPending(null); setResults([]); setNotice('Your data has been reset.');
    return true;
  }, [state.version]);

  return <Context.Provider value={{ snapshot: state.snapshot, version: state.version, pending, notice, results, request, approve, reject, executeBatch, reset }}>{children}</Context.Provider>;
}

/** Search and reusable shell components may render outside a demo provider in tests. */
export function useOptionalDemo(): DemoContextValue | null {
  return useContext(Context);
}

export function useDemo(): DemoContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('DemoProvider is required for simulation pages');
  return value;
}

