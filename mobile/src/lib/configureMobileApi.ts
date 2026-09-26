import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { configureApi } from '@myfinances/core/api/client';
import { appStorage } from './storage';
import { currentToken, queryCacheKey, useSession } from './session';

const DEFAULT_API_BASE_URL = 'https://api.my-finances.site';

function resolveApiBaseUrl(): string {
  const configured = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  return `${(configured ?? DEFAULT_API_BASE_URL).replace(/\/$/, '')}/api`;
}

export async function clearPersistedQueries(): Promise<void> {
  appStorage.remove(queryCacheKey(useSession.getState().user));
}

export async function signOutLocally(): Promise<void> {
  await clearPersistedQueries();
  await useSession.getState().signOut();
}

configureApi({
  baseUrl: resolveApiBaseUrl(),
  credentials: 'omit',
  getToken: currentToken,
  onDemoBlocked: () => Alert.alert('Demo mode', 'Demo data is read-only'),
  onUnauthorized: () => {
    signOutLocally().finally(() => router.replace('/login'));
  },
  onLoggedOut: signOutLocally,
});
