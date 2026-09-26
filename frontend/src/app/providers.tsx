'use client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactNode, useState } from 'react';
import { createQueryPersister } from '@/lib/queryPersister';
import { QUERY_CACHE_MAX_AGE_MS, shouldPersistQuery } from '@myfinances/core/api/persistence';
import '@/api/configs/configureWebApi';

export default function Providers({ children }: { children: ReactNode }) {
  const [{ queryClient, persister }] = useState(() => ({
    queryClient: new QueryClient({
      defaultOptions: { queries: { gcTime: QUERY_CACHE_MAX_AGE_MS } },
    }),
    persister: createQueryPersister(),
  }));

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: QUERY_CACHE_MAX_AGE_MS,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
