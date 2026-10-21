'use client';

import { LocalizedInput } from '../../i18n/localized';
import { LocalizedLink as Link } from '../../i18n/localized';
import { useSearchParams } from 'next/navigation';
import { Suspense, type ComponentProps } from 'react';
import { withAccount } from '../../lib/account-navigation';

type AccountLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

function AccountLinkContent({ href, ...props }: AccountLinkProps) {
  const accountId = useSearchParams().get('account');
  return <Link {...props} href={withAccount(href, accountId)} />;
}

export function AccountLink(props: AccountLinkProps) {
  return <Suspense fallback={<Link {...props} />}><AccountLinkContent {...props} /></Suspense>;
}

function AccountFieldContent() {
  const accountId = useSearchParams().get('account');
  return accountId ? <LocalizedInput type="hidden" name="account" value={accountId} /> : null;
}

/** GET forms need a field because submitting them replaces the action's query. */
export function AccountField() {
  return <Suspense fallback={null}><AccountFieldContent /></Suspense>;
}
