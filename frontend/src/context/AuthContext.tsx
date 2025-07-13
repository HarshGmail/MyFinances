'use client';
import React, { createContext, useContext, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface AuthContextType {
  user: string | null;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoggedIn: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);

  // On mount, sync Zustand user state with localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser && !user) {
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
