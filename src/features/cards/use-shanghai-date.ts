'use client';
import { useSyncExternalStore } from 'react';
import { shanghaiToday } from './reminder-model';

const subscribe = (onChange: () => void) => {
  const interval = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(interval);
};
const serverDate = () => '';
export function useShanghaiDate() {
  return useSyncExternalStore(subscribe, shanghaiToday, serverDate);
}
