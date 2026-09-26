import { useEffect } from 'react';
import { AppState } from 'react-native';
import { refreshMobileToken } from '@myfinances/core/api/mobileAuth';
import { useSession } from './session';

async function refreshIfStale() {
  if (!useSession.getState().token) return;
  try {
    const refreshed = await refreshMobileToken();
    if (refreshed) await useSession.getState().replaceToken(refreshed.token);
  } catch {
    return;
  }
}

export function useTokenRefresh() {
  useEffect(() => {
    refreshIfStale();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshIfStale();
    });
    return () => subscription.remove();
  }, []);
}
