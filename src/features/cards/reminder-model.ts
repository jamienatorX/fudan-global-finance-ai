export type CardReminder = Readonly<{ id: string; name: string; lastFour: string; amount: string; dueDate: string; leadDays: number; paid: boolean }>;
export const shanghaiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function validateReminder(bill: CardReminder) {
  if (!bill.name?.trim() || bill.name.length > 60 || !/^\d{4}$/.test(bill.lastFour)) throw new Error('Enter a card name and only its last four digits.');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(bill.amount) || Number(bill.amount) <= 0) throw new Error('Enter a positive statement amount in CNY.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bill.dueDate) || !Number.isFinite(Date.parse(bill.dueDate)) || new Date(bill.dueDate).toISOString().slice(0, 10) !== bill.dueDate) throw new Error('Choose a valid due date.');
  if (![1, 3, 7].includes(bill.leadDays) || typeof bill.paid !== 'boolean' || typeof bill.id !== 'string') throw new Error('Choose a reminder lead time.');
}
export function reminderStatus(bill: CardReminder, today: string) {
  if (bill.paid) return 'Paid';
  const days = Math.round((Date.parse(bill.dueDate) - Date.parse(today)) / 86_400_000);
  return days < 0 ? 'Overdue' : days === 0 ? 'Due today' : days <= bill.leadDays ? 'Due soon' : 'Upcoming';
}
export function reminderCalendar(bill: CardReminder) {
  validateReminder(bill);
  const escape = (s: string) => s.replaceAll('\\', '\\\\').replaceAll('\r', '').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
  const date = bill.dueDate.replaceAll('-', '');
  const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}/, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//福 Bank//Card Reminders//EN', 'BEGIN:VEVENT', `UID:${date}-${bill.lastFour}-${bill.amount.replace('.', '-')}@fu-bank`, `DTSTAMP:${stamp}`, `DTSTART:${date}T010000Z`, `DTEND:${date}T013000Z`, `SUMMARY:${escape('Pay ' + bill.name)}`, `DESCRIPTION:${escape('Card ending ' + bill.lastFour + '. Statement CNY ' + bill.amount + '. Pay through your card issuer. 福 Bank does not make this payment.')}`, 'BEGIN:VALARM', `TRIGGER:-P${bill.leadDays}D`, 'ACTION:DISPLAY', 'DESCRIPTION:Credit card payment due', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}
