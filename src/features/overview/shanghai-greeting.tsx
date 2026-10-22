'use client';
import { LocalizedCopy } from '../../i18n/localized';
import { useEffect, useState } from 'react';
export function shanghaiGreeting(at: Date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', hourCycle: 'h23' }).format(at));
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}
export function ShanghaiGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState('Welcome');
  useEffect(() => {
    const update = () => setGreeting(shanghaiGreeting());
    update(); const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);
  return <LocalizedCopy>{greeting}, {name}</LocalizedCopy>;
}
