'use client';
import React, { createContext, useContext, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { User } from '@/api/dataInterface';
import { getItemFromLocalStorage } from '@/utils/localStorageHelpers';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoggedIn: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);

  // On mount, sync Zustand user state with localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = getItemFromLocalStorage<User>('user');
      if (storedUser && typeof storedUser === 'object' && !Array.isArray(storedUser) && !user) {
        setUser(storedUser);
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
