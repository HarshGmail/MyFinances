import '../global.css';
import '@/lib/configureMobileApi';
import { useEffect, useState } from 'react';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QUERY_CACHE_MAX_AGE_MS, shouldPersistQuery } from '@myfinances/core/api/persistence';
import { asyncAppStorage } from '@/lib/storage';
import { queryCacheKey, useSession } from '@/lib/session';
import { useTokenRefresh } from '@/lib/useTokenRefresh';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    border: colors.border,
    primary: colors.foreground,
  },
};

function QueryProvider({ children }: { children: React.ReactNode }) {
  const user = useSession((state) => state.user);
  const cacheKey = queryCacheKey(user);
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { gcTime: QUERY_CACHE_MAX_AGE_MS } } })
  );
  const [persister, setPersister] = useState(() =>
    createAsyncStoragePersister({ storage: asyncAppStorage, key: cacheKey })
  );

  useEffect(() => {
    queryClient.clear();
    setPersister(createAsyncStoragePersister({ storage: asyncAppStorage, key: cacheKey }));
  }, [cacheKey, queryClient]);

  return (
    <PersistQueryClientProvider
      key={cacheKey}
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: QUERY_CACHE_MAX_AGE_MS,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

export default function RootLayout() {
  const isRestored = useSession((state) => state.isRestored);
  const restore = useSession((state) => state.restore);
  useTokenRefresh();

  useEffect(() => {
    restore().finally(() => SplashScreen.hideAsync());
  }, [restore]);

  if (!isRestored) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <QueryProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryProvider>
    </ThemeProvider>
  );
}
