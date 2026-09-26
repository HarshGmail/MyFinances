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
import { usePushRegistration } from '@/lib/pushNotifications';
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

function QueryProvider({ cacheKey, children }: { cacheKey: string; children: React.ReactNode }) {
  const [{ queryClient, persister }] = useState(() => ({
    queryClient: new QueryClient({
      defaultOptions: { queries: { gcTime: QUERY_CACHE_MAX_AGE_MS } },
    }),
    persister: createAsyncStoragePersister({ storage: asyncAppStorage, key: cacheKey }),
  }));

  return (
    <PersistQueryClientProvider
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
  const cacheKey = queryCacheKey(useSession((state) => state.user));
  const restore = useSession((state) => state.restore);
  useTokenRefresh();
  usePushRegistration();

  useEffect(() => {
    restore().finally(() => SplashScreen.hideAsync());
  }, [restore]);

  if (!isRestored) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <QueryProvider key={cacheKey} cacheKey={cacheKey}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryProvider>
    </ThemeProvider>
  );
}
