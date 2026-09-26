'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { User } from '@myfinances/core/types';
import { apiRequest } from '@/api/configs';
import { clearQueryCache } from '@/lib/queryPersister';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isSessionResolved: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isSessionResolved: false,
});

const UNAUTHORIZED_STATUS = 401;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const [isSessionResolved, setIsSessionResolved] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function restoreSession() {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        if (isActive) setIsSessionResolved(true);
        return;
      }

      setUser(JSON.parse(storedUser));

      try {
        await apiRequest({ endpoint: '/verify', skipAuthRedirect: true });
      } catch (error) {
        const isRejectedByServer = (error as { status?: number })?.status === UNAUTHORIZED_STATUS;
        if (isRejectedByServer && isActive) {
          await clearQueryCache();
          localStorage.removeItem('user');
          setUser(null);
        }
      } finally {
        if (isActive) setIsSessionResolved(true);
      }
    }

    restoreSession();
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, isSessionResolved }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
