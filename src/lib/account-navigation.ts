/** Carry only account context; retain the destination's own query and fragment. */
export function withAccount(href: string, accountId: string | null): string {
  if (!accountId) return href;
  const url = new URL(href, 'https://finance.invalid');
  url.searchParams.set('account', accountId);
  return `${url.pathname}${url.search}${url.hash}`;
}
