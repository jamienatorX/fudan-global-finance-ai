import { createServerSupabaseClient } from '../lib/supabase/server';

export type TableItem = Record<string, unknown>;
export type BankingState = {
  enrolled: boolean;
  version: number;
  accounts: TableItem[];
  budgets: TableItem[];
  subscriptions: TableItem[];
  cards: TableItem[];
  tuition: TableItem[];
  products: TableItem[];
  holdings: TableItem[];
  actions: TableItem[];
  ledger: TableItem[];
  audit: TableItem[];
};
export type SimClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function authenticatedBanking() {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId || typeof userId !== 'string') return null;
  return { client, userId };
}

/** RLS checks owner IDs independently of the Next.js claims guard. */
export async function readBankingState(client: SimClient): Promise<BankingState> {
  const names = ['sim_profiles','sim_accounts','sim_budgets','sim_subscriptions','sim_cards',
    'sim_tuition','sim_products','sim_holdings','sim_actions','sim_ledger','sim_audit'] as const;
  const responses = await Promise.all(names.map(name => client.from(name).select('*').limit(
    name==='sim_ledger'||name==='sim_audit'?100:1000
  )));
  for (const response of responses) if (response.error) throw new Error('Financial state is temporarily unavailable');
  const data = Object.fromEntries(names.map((name,i)=>[name,responses[i].data??[]]));
  const rows = (name:string)=>data[name] as TableItem[];
  const profile = rows('sim_profiles')[0];
  return {
    enrolled:Boolean(profile), version: profile ? Number(profile.version) : 0,
    accounts:rows('sim_accounts'),budgets:rows('sim_budgets'),subscriptions:rows('sim_subscriptions'),
    cards:rows('sim_cards'),tuition:rows('sim_tuition'),products:rows('sim_products'),
    holdings:rows('sim_holdings'),actions:rows('sim_actions').sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))),
    ledger:rows('sim_ledger').sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))),
    audit:rows('sim_audit').sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))),
  };
}


export function securityFailure(message: string) {
  for (const code of ['MFA_REQUIRED','REAUTH_REQUIRED','SESSION_EXPIRED','RATE_LIMITED','AUTH_REQUIRED']) {
    if (message.includes(code)) return {code, status:code==='RATE_LIMITED'?429:code==='AUTH_REQUIRED'||code==='SESSION_EXPIRED'?401:403};
  }
  return null;
}
