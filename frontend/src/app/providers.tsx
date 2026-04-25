'use client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactNode, useState } from 'react';
import { createQueryPersister } from '@/lib/queryPersister';

const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

// Only stable, user-owned data that rarely changes belongs here.
// Live prices, charts, analytics, and search results are intentionally excluded.
const PERSISTENT_QUERY_KEYS = new Set([
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
]);

export default function Providers({ children }: { children: ReactNode }) {
  const [{ queryClient, persister }] = useState(() => ({
    queryClient: new QueryClient({
      defaultOptions: { queries: { gcTime: TWENTY_FOUR_HOURS } },
    }),
    persister: createQueryPersister(),
  }));

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: TWENTY_FOUR_HOURS,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            PERSISTENT_QUERY_KEYS.has(query.queryKey[0] as string) &&
            query.state.status === 'success',
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
