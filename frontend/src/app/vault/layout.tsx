'use client';

import { ReactNode } from 'react';
import { VaultSessionProvider } from './useVaultSession';

export default function VaultLayout({ children }: { children: ReactNode }) {
  return <VaultSessionProvider>{children}</VaultSessionProvider>;
}
