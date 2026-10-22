import { describe, expect, it } from 'vitest';
import { withAccount } from '../../src/lib/account-navigation';

describe('account-aware destination URLs', () => {
  it('preserves destination query and fragment while replacing stale account context', () => {
    const url = new URL(withAccount('/copilot?prompt=Pay%20tuition&account=old#plan', 'account/new'), 'https://finance.invalid');
    expect(url.searchParams.get('prompt')).toBe('Pay tuition');
    expect(url.searchParams.getAll('account')).toEqual(['account/new']);
    expect(url.hash).toBe('#plan');
  });

  it('leaves account-free navigation unchanged when no account is selected', () => {
    expect(withAccount('/overview', null)).toBe('/overview');
  });
});
