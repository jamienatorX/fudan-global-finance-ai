'use client';
/* eslint-disable react-hooks/set-state-in-effect -- Browser storage must hydrate after mount to preserve server/client markup. Persistence failures also update the storage status. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { MARKET_CATALOG } from './market-catalog';
import { validateReminder, type CardReminder } from '../cards/reminder-model';

const KEY = 'fu-bank:investing-preferences:v1';
type Preferences = { watchlist: string[]; reminders: CardReminder[] };
const initial: Preferences = { watchlist: ['aapl', 'cgb-3y'], reminders: [] };
const Context = createContext<{ preferences: Preferences; save: (next: Preferences) => void; storageWarning: boolean } | null>(null);
export function InvestingPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(initial);
  const [ready, setReady] = useState(false);
  const [storageWarning, setWarning] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const value = JSON.parse(raw) as Preferences;
        if (!Array.isArray(value.watchlist) || !Array.isArray(value.reminders)) throw new Error('Invalid preferences');
        const reminders = value.reminders.slice(0, 50).filter(b => { try { validateReminder(b); return true; } catch { return false; } });
        setPreferences({ watchlist: value.watchlist.filter(id => MARKET_CATALOG.some(i => i.id === id)), reminders });
      }
    } catch { setWarning(true); }
    setReady(true);
    const reset = () => setPreferences(initial);
    window.addEventListener('fu-bank:reset', reset);
    return () => window.removeEventListener('fu-bank:reset', reset);
  }, []);
  useEffect(() => {
    if (ready) { try { localStorage.setItem(KEY, JSON.stringify(preferences)); } catch { setWarning(true); } }
  }, [preferences, ready]);
  return <Context.Provider value={{ preferences, save: setPreferences, storageWarning }}>{children}</Context.Provider>;
}
export function useInvestingPreferences() { return useContext(Context); }
