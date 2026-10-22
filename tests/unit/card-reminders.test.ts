import { expect, it } from 'vitest';
import { reminderStatus, reminderCalendar, validateReminder } from '../../src/features/cards/reminder-model';

const bill = { id: 'bill-1', name: 'Student credit card', lastFour: '1234', amount: '500.00', dueDate: '2026-11-01', leadDays: 3, paid: false };
it('calculates due windows using Shanghai calendar dates', () => {
  expect(reminderStatus(bill, '2026-10-28')).toBe('Upcoming');
  expect(reminderStatus(bill, '2026-10-29')).toBe('Due soon');
  expect(reminderStatus(bill, '2026-11-01')).toBe('Due today');
  expect(reminderStatus(bill, '2026-11-02')).toBe('Overdue');
  expect(reminderStatus({ ...bill, paid: true }, '2026-11-02')).toBe('Paid');
});
it('validates dates, money and safe card identifiers', () => {
  expect(() => validateReminder(bill)).not.toThrow();
  expect(() => validateReminder({ ...bill, dueDate: '2026-02-30' })).toThrow();
  expect(() => validateReminder({ ...bill, amount: '-1' })).toThrow();
  expect(() => validateReminder({ ...bill, lastFour: '123456789' })).toThrow();
});
it('exports a real UTC event with an explicit reminder and escaped text', () => {
  const ics = reminderCalendar({ ...bill, name: 'Card, one\nTest' });
  expect(ics).toContain('DTSTART:20261101T010000Z');
  expect(ics).toContain('TRIGGER:-P3D');
  expect(ics).toContain('BEGIN:VALARM');
  expect(ics).toContain('Card\\, one\\nTest');
});
