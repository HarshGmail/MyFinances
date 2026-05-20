import { create } from 'zustand';
import { User } from '@/api/dataInterface';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}));
