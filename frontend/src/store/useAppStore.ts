import { create } from 'zustand';
import { User } from '@/api/dataInterface';

interface FilterState {
  [key: string]: string[];
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  // Filter state
  filters: FilterState;
  tempFilters: FilterState;
  setFilters: (filters: FilterState) => void;
  setTempFilters: (filters: FilterState) => void;
  clearFilters: () => void;
  // Add more global state as needed
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  // Filter state
  filters: { dateSort: ['latest'] },
  tempFilters: { dateSort: ['latest'] },
  setFilters: (filters) => set({ filters }),
  setTempFilters: (tempFilters) => set({ tempFilters }),
  clearFilters: () =>
    set({ filters: { dateSort: ['latest'] }, tempFilters: { dateSort: ['latest'] } }),
}));
