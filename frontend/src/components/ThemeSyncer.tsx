'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function ThemeSyncer() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return null;
}
