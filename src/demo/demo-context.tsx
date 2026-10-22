'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {withSampleHistory,demoAgentContext,verifyProposal} from '../agent/context-adapters';
import type {AgentContext,Proposal} from '../agent/contracts';
import type { FinancialSnapshot } from '../domain/entities';
import { fromFinancialSnapshotDTO, toFinancialSnapshotDTO, type FinancialSnapshotDTO } from '../domain/financial-snapshot-dto';
import { createSeedSnapshot, DEFAULT_SEED_VERSION, normalizeDemoSnapshot } from './seed';
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
  loadAgentHistory: () => void;
  getAgentContext: () => AgentContext;
  decideAgent: (id:string,action:Proposal,version:number,expiresAt:number,approve:boolean) => {status:string;verified:boolean};
}>;
const Context = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setReactState] = useState<DemoState>(() => ({ snapshot: createSeedSnapshot(DEFAULT_SEED_VERSION), version: 0 }));
  const stateRef=useRef(state);
  const agentResults=useRef(new Map<string,{status:string;verified:boolean}>());
  const setState=useCallback((next:DemoState)=>{stateRef.current=next;setReactState(next);},[]);
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
          setState({ snapshot: normalizeDemoSnapshot(fromFinancialSnapshotDTO(saved.snapshot)), version: saved.version });
        }
      }
    } catch { /* Corrupt browser-local demos always fall back to the versioned fixture. */ }
    // Mount-time hydration protects the server/client seed agreement.
    setHydrated(true);
  }, [setState]);
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
  }, [pending, state, setState]);

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
  }, [state, setState]);

  const reset = useCallback((confirmation: string) => {
    if (confirmation !== 'RESET DEMO') { setNotice('Enter RESET DEMO to confirm.'); return false; }
    window.dispatchEvent(new Event('fu-bank:reset'));
    const snapshot = createSeedSnapshot(DEFAULT_SEED_VERSION);
    setState({ snapshot, version: state.version + 1 });
    setPending(null); setResults([]); setNotice('Your data has been reset.');
    return true;
  }, [state.version, setState]);

  function loadAgentHistory(){
    const current=stateRef.current,next=withSampleHistory(current.snapshot);
    if(next.transactions.length===current.snapshot.transactions.length)return;
    const id=crypto.randomUUID();
    setState({snapshot:{...next,auditEvents:[...next.auditEvents,{id,ownerId:next.users[0].id,actorId:next.users[0].id,eventType:'agent.sample-history.loaded',targetId:id,beforeSummary:null,afterSummary:{source:'explicit fictional fixture; balances unchanged'},outcome:'success',correlationId:id,occurredAt:new Date().toISOString()}]},version:current.version+1});
  }
  function decideAgent(id:string,action:Proposal,version:number,expiresAt:number,approved:boolean){
    const previous=agentResults.current.get(id);if(previous)return previous;
    const stored=stateRef.current.snapshot.auditEvents.find(e=>e.targetId===id&&e.eventType.startsWith('agent.action.'));
    if(stored){const summary=stored.afterSummary;return{status:stored.eventType.slice('agent.action.'.length),verified:Boolean(summary&&typeof summary==='object'&&!Array.isArray(summary)&&'verified' in summary&&summary.verified===true)};}
    const current=stateRef.current;
    let status=Date.now()>expiresAt?'expired':current.version!==version?'stale':approved?'executed':'rejected';
    let next=current.snapshot;
    if(status==='executed'){
      const demoAction=action as unknown as DemoAction;
      try{next=applyDemoAction(next,demoAction,id).snapshot;}catch{status='failed';}
    }
    const outcome={status,verified:status==='executed'&&verifyProposal(action,demoAgentContext(next,current.version+1),id,demoAgentContext(current.snapshot,current.version))};
    const auditId=crypto.randomUUID();
    next={...next,auditEvents:[...next.auditEvents,{id:auditId,ownerId:next.users[0].id,actorId:next.users[0].id,eventType:'agent.action.'+status,targetId:id,beforeSummary:{version},afterSummary:{verified:outcome.verified},outcome:status==='executed'||status==='rejected'?'success':'failure',correlationId:id,occurredAt:new Date().toISOString()}]};
    setState({snapshot:next,version:current.version+(status==='executed'?1:0)});
    agentResults.current.set(id,outcome);return outcome;
  }
  return <Context.Provider value={{ snapshot: state.snapshot, version: state.version, pending, notice, results, request, approve, reject, executeBatch, reset, loadAgentHistory,decideAgent,getAgentContext:()=>demoAgentContext(stateRef.current.snapshot,stateRef.current.version) }}>{children}</Context.Provider>;
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



