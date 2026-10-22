'use client';
import { LocalizedArticle, LocalizedButton, LocalizedDiv, LocalizedForm, LocalizedH2, LocalizedInput, LocalizedLabel, LocalizedOption, LocalizedP, LocalizedSection, LocalizedSelect, LocalizedSpan, LocalizedStrong } from '../../i18n/localized';
import { useState } from 'react';
import { BellRing, CalendarPlus, Check, Plus, Trash2 } from 'lucide-react';
import { useInvestingPreferences } from '../investing/investing-preferences';
import { reminderStatus, reminderCalendar, validateReminder, type CardReminder } from './reminder-model';
import { useShanghaiDate } from './use-shanghai-date';
import { AccountLink as Link } from '../../components/shell/account-link';

export function CardReminders({ compact = false }: { compact?: boolean }) {
  const context = useInvestingPreferences();
  const today = useShanghaiDate();
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  if (!context) return null;
  const { preferences, save, storageWarning } = context;
  const reminders = [...preferences.reminders].sort((a, b) => Number(a.paid) - Number(b.paid) || a.dueDate.localeCompare(b.dueDate));
  const selected = preferences.reminders.find(b => b.id === editing);
  const persist = (bill: CardReminder) => save({ ...preferences, reminders: editing ? preferences.reminders.map(b => b.id === editing ? bill : b) : [...preferences.reminders, bill] });
  function download(bill: CardReminder) {
    const url = URL.createObjectURL(new Blob([reminderCalendar(bill)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'fu-bank-card-reminder.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Calendar file downloaded. Open it in your calendar app to activate its reminder.');
  }
  return <LocalizedSection className="invest-panel" aria-labelledby={compact ? 'card-reminder-summary' : 'card-reminder-title'}>
    <LocalizedDiv className="invest-section-heading"><LocalizedDiv><LocalizedP className="invest-eyebrow">Stay on schedule</LocalizedP><LocalizedH2 id={compact ? 'card-reminder-summary' : 'card-reminder-title'}><BellRing size={21} aria-hidden />Credit card reminders</LocalizedH2></LocalizedDiv>
      {compact ? <Link href="/cards#reminders" className="invest-text-link">Manage reminders →</Link> : <LocalizedButton className="invest-button secondary" onClick={() => { setShowForm(!showForm); setEditing(null); setError(''); }}><Plus size={16} aria-hidden />Add reminder</LocalizedButton>}
    </LocalizedDiv>
    <LocalizedP className="invest-muted">Set a statement due date. Download a calendar alert to be reminded even when 福 Bank is closed.</LocalizedP>
    {storageWarning && <LocalizedP role="status" className="invest-notice">Browser storage is unavailable or was reset. Changes may only last this session.</LocalizedP>}
    {!reminders.length && <LocalizedDiv className="invest-empty"><CalendarPlus size={24} aria-hidden /><LocalizedP>No card bills added yet.</LocalizedP>{compact ? <Link href="/cards#reminders" className="invest-text-link">Set your first reminder →</Link> : <LocalizedP className="invest-muted">Add a reminder using the card’s last four digits and statement amount. No full card number needed.</LocalizedP>}</LocalizedDiv>}
    <LocalizedDiv className="reminder-list">{(compact ? reminders.filter(b => !b.paid).slice(0, 3) : reminders).map(bill => <LocalizedArticle className="reminder-row" key={bill.id}>
      <LocalizedDiv><LocalizedStrong>{bill.name} · ••{bill.lastFour}</LocalizedStrong><LocalizedP className="invest-muted">CNY {Number(bill.amount).toFixed(2)} · Due {bill.dueDate} · {bill.leadDays} day alert</LocalizedP></LocalizedDiv>
      <LocalizedSpan className={`invest-tag ${bill.paid ? '' : 'warning'}`}>{today ? reminderStatus(bill, today) : 'Checking date'}</LocalizedSpan>
      {!compact && <LocalizedDiv className="reminder-actions"><LocalizedButton className="invest-icon-button" aria-label={'Download calendar for ' + bill.name} title="Download calendar alert" onClick={() => download(bill)}><CalendarPlus size={18} /></LocalizedButton><LocalizedButton className="invest-icon-button" aria-label={(bill.paid ? 'Reopen ' : 'Mark paid ') + bill.name} title={bill.paid ? 'Reopen reminder' : 'Mark as paid (no payment made)'} onClick={() => { save({ ...preferences, reminders: preferences.reminders.map(b => b.id === bill.id ? { ...b, paid: !b.paid } : b) }); setMessage(bill.paid ? 'Reminder reopened.' : 'Marked as paid. 福 Bank has not made a payment.'); }}><Check size={18} /></LocalizedButton><LocalizedButton className="invest-text-link" onClick={() => { setEditing(bill.id); setShowForm(true); }}>Edit</LocalizedButton><LocalizedButton className="invest-icon-button" aria-label={'Delete reminder for ' + bill.name} onClick={() => save({ ...preferences, reminders: preferences.reminders.filter(b => b.id !== bill.id) })}><Trash2 size={17} /></LocalizedButton></LocalizedDiv>}
    </LocalizedArticle>)}</LocalizedDiv>
    {compact && reminders.length > 0 && reminders.every(b => b.paid) && <LocalizedP className="invest-notice">All recorded bills are marked paid.</LocalizedP>}
    {!compact && showForm && <LocalizedForm key={editing ?? 'new'} className="reminder-form" onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      try {
        if (!editing && preferences.reminders.length >= 50) throw new Error('Maximum 50 reminders. Remove an old reminder first.');
        const bill: CardReminder = { id: editing ?? crypto.randomUUID(), name: String(data.get('name')).trim(), lastFour: String(data.get('lastFour')), amount: String(data.get('amount')), dueDate: String(data.get('dueDate')), leadDays: Number(data.get('leadDays')), paid: selected?.paid ?? false };
        validateReminder(bill); persist(bill); setShowForm(false); setEditing(null); setError(''); setMessage('Reminder saved on this browser. Download its calendar alert for notifications outside 福 Bank.');
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check reminder details.'); }
    }}>
      <LocalizedLabel>Card nickname<LocalizedInput name="name" required maxLength={60} defaultValue={selected?.name} placeholder="e.g. Student credit card" /></LocalizedLabel>
      <LocalizedLabel>Last four digits<LocalizedInput name="lastFour" required pattern="[0-9]{4}" maxLength={4} inputMode="numeric" defaultValue={selected?.lastFour} placeholder="1234" /></LocalizedLabel>
      <LocalizedLabel>Statement amount (CNY)<LocalizedInput name="amount" required inputMode="decimal" defaultValue={selected?.amount} placeholder="500.00" /></LocalizedLabel>
      <LocalizedLabel>Due date (Shanghai)<LocalizedInput name="dueDate" required type="date" defaultValue={selected?.dueDate} /></LocalizedLabel>
      <LocalizedLabel>Remind me<LocalizedSelect name="leadDays" defaultValue={selected?.leadDays ?? 3}><LocalizedOption value="1">1 day before</LocalizedOption><LocalizedOption value="3">3 days before</LocalizedOption><LocalizedOption value="7">7 days before</LocalizedOption></LocalizedSelect></LocalizedLabel>
      <LocalizedDiv className="flex flex-wrap items-end gap-2"><LocalizedButton className="invest-button" type="submit">Save reminder</LocalizedButton><LocalizedButton className="invest-button secondary" type="button" onClick={() => setShowForm(false)}>Cancel</LocalizedButton></LocalizedDiv>
    </LocalizedForm>}
    {error && <LocalizedP className="invest-notice warning" role="alert">{error}</LocalizedP>}{message && !compact && <LocalizedP className="invest-notice" role="status">{message}</LocalizedP>}
    {!compact && <LocalizedP className="invest-fineprint">Reminders are stored on this browser. Paid status is a personal record; it does not pay the issuer or verify settlement. Calendar notifications depend on your calendar settings.</LocalizedP>}
  </LocalizedSection>;
}
