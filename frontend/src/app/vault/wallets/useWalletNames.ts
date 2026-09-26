'use client';

import { useEffect, useState } from 'react';
import { WalletSummary } from '@myfinances/core/types';
import { decryptItem } from '@/utils/vaultCrypto';

type WalletKeyResolver = (
  walletId: string,
  wrappedWalletKey: WalletSummary['wrappedWalletKey'],
  keyEpoch: number
) => Promise<CryptoKey | null>;

const UNREADABLE_WALLET_NAME = 'Unreadable wallet';

export function useWalletNames(
  wallets: WalletSummary[] | undefined,
  resolveWalletKey: WalletKeyResolver
) {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!wallets || wallets.length === 0) {
      setNames({});
      return;
    }
    let cancelled = false;

    async function decryptNames(entries: WalletSummary[]) {
      const resolved: Record<string, string> = {};
      for (const wallet of entries) {
        const key = await resolveWalletKey(
          wallet.id,
          wallet.wrappedWalletKey,
          wallet.memberKeyEpoch
        );
        if (!key || !wallet.encryptedName) {
          resolved[wallet.id] = UNREADABLE_WALLET_NAME;
          continue;
        }
        try {
          const decoded = await decryptItem<{ name: string }>(key, wallet.encryptedName);
          resolved[wallet.id] = decoded.name || UNREADABLE_WALLET_NAME;
        } catch {
          resolved[wallet.id] = UNREADABLE_WALLET_NAME;
        }
      }
      if (!cancelled) setNames(resolved);
    }

    decryptNames(wallets);
    return () => {
      cancelled = true;
    };
  }, [wallets, resolveWalletKey]);

  return names;
}
