import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { User } from '@myfinances/core/types';
import type { MobileSession } from '@myfinances/core/api/mobileAuth';
import { appStorage } from './storage';

const TOKEN_KEY = 'myfinances.session.token';
const USER_KEY = 'myfinances.session.user';

interface SessionState {
  token: string | null;
  user: User | null;
  isRestored: boolean;
  restore: () => Promise<void>;
  signIn: (session: MobileSession) => Promise<void>;
  replaceToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function readStoredUser(): User | null {
  const raw = appStorage.getString(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useSession = create<SessionState>((set) => ({
  token: null,
  user: null,
  isRestored: false,
  restore: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ token, user: token ? readStoredUser() : null, isRestored: true });
  },
  signIn: async ({ token, user }) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    appStorage.set(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },
  replaceToken: async (token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token });
  },
  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    appStorage.remove(USER_KEY);
    set({ token: null, user: null });
  },
}));

export function currentToken(): string | null {
  return useSession.getState().token;
}

export function queryCacheKey(user: User | null): string {
  return `myfinances-cache-${user?.id ?? user?.email ?? 'anon'}`;
}
