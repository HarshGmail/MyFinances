// Only stable, user-owned data that rarely changes belongs here.
// Live prices, charts, analytics, and search results are intentionally excluded.
export const PERSISTENT_QUERY_KEYS: ReadonlySet<string> = new Set([
  'stock-transactions',
  'crypto-transactions',
  'goldTransactions',
  'mutual-fund-transactions',
  'mutual-fund-info',
  'epf-account',
  'epf-timeline',
  'fixed-deposits-fetch',
  'recurring-deposits-fetch',
  'expenses',
  'user-goals',
  'asset-targets',
  'user-profile',
  'expenseTransactionNames',
  'stocks-portfolio',
  'capital-gains',
  'safe-gold-rates',
  'crypto-prices',
  'mfapi-nav-latest',
]);

export const QUERY_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

export function shouldPersistQuery(query: {
  queryKey: readonly unknown[];
  state: { status: string };
}) {
  return PERSISTENT_QUERY_KEYS.has(query.queryKey[0] as string) && query.state.status === 'success';
}
