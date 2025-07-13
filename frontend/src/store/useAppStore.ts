import { create } from 'zustand';

interface FilterState {
  [key: string]: string[];
}

interface AppState {
  user: string | null;
  setUser: (user: string | null) => void;
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
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('user', user);
      } else {
        localStorage.removeItem('user');
      }
    }
    set({ user });
  },
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
