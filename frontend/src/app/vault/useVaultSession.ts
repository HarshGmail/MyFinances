'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { VaultCategory, VaultItemContent, WrappedWalletKey } from '@/api/dataInterface';
import { useVaultMetaQuery } from '@/api/query';
import {
  confirmVaultUnlock,
  fetchVaultItems,
  requestVaultUnlock,
  useDeleteVaultItemMutation,
  useDestroyVaultMutation,
  useInitVaultMutation,
  useRekeyVaultMutation,
  useSaveVaultItemMutation,
  useSaveVaultKeyPairMutation,
} from '@/api/mutations';
import {
  VAULT_KDF_ITERATIONS,
  VaultWrongPinError,
  createVerifier,
  decryptItem,
  deriveKey,
  encryptItem,
  generateSalt,
  generateUserKeyPair,
  isVaultCryptoAvailable,
  newItemId,
  unwrapKeyWithPrivateKey,
  verifyPin,
} from '@/utils/vaultCrypto';
import { VaultDecryptedItem } from './vaultTypes';

export type VaultStatus = 'loading' | 'unsupported' | 'setup' | 'locked' | 'unlocked';

export const VAULT_IDLE_LOCK_MS = 5 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 15 * 1000;
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'focus'];

export function useVaultSession() {
  const { data: meta, isLoading: isMetaLoading, refetch: refetchMeta } = useVaultMetaQuery();
  const { mutateAsync: initVault } = useInitVaultMutation();
  const { mutateAsync: saveVaultItem } = useSaveVaultItemMutation();
  const { mutateAsync: deleteVaultItem } = useDeleteVaultItemMutation();
  const { mutateAsync: rekeyVault } = useRekeyVaultMutation();
  const { mutateAsync: destroyVault } = useDestroyVaultMutation();
  const { mutateAsync: saveKeyPair } = useSaveVaultKeyPairMutation();

  const [cryptoAvailable, setCryptoAvailable] = useState<boolean | null>(null);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [items, setItems] = useState<VaultDecryptedItem[]>([]);
  const [damagedIds, setDamagedIds] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [privateKeyJwk, setPrivateKeyJwk] = useState<JsonWebKey | null>(null);
  const [publicKeyJwk, setPublicKeyJwk] = useState<JsonWebKey | null>(null);
  const lastActivityRef = useRef(Date.now());
  const walletKeysRef = useRef(new Map<string, CryptoKey>());

  useEffect(() => {
    setCryptoAvailable(isVaultCryptoAvailable());
  }, []);

  const lock = useCallback(() => {
    setKey(null);
    setItems([]);
    setDamagedIds([]);
    setPrivateKeyJwk(null);
    setPublicKeyJwk(null);
    walletKeysRef.current.clear();
  }, []);

  const loadItems = useCallback(async (vaultKey: CryptoKey) => {
    const records = await fetchVaultItems();
    const decrypted: VaultDecryptedItem[] = [];
    const damaged: string[] = [];
    for (const record of records) {
      if (!record.ciphertext) {
        damaged.push(record.id);
        continue;
      }
      try {
        const content = await decryptItem<VaultItemContent>(vaultKey, record.ciphertext);
        decrypted.push({
          id: record.id,
          category: record.category,
          content,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      } catch {
        damaged.push(record.id);
      }
    }
    setItems(decrypted);
    setDamagedIds(damaged);
  }, []);

  const createVault = useCallback(
    async (pin: string) => {
      setIsBusy(true);
      try {
        const salt = generateSalt();
        const derivedKey = await deriveKey(pin, salt, VAULT_KDF_ITERATIONS);
        const verifier = await createVerifier(derivedKey);
        const keyPair = await generateUserKeyPair();
        const wrappedPrivateKey = await encryptItem(derivedKey, keyPair.privateKey);
        await initVault({
          salt,
          verifier,
          iterations: VAULT_KDF_ITERATIONS,
          publicKey: keyPair.publicKey,
          wrappedPrivateKey,
        });
        setItems([]);
        setDamagedIds([]);
        setPrivateKeyJwk(keyPair.privateKey);
        setPublicKeyJwk(keyPair.publicKey);
        setKey(derivedKey);
        lastActivityRef.current = Date.now();
      } finally {
        setIsBusy(false);
      }
    },
    [initVault]
  );

  const ensureSharingKeys = useCallback(
    async (
      vaultKey: CryptoKey,
      storedPublicKey: JsonWebKey | null,
      storedWrapped: string | null
    ) => {
      if (storedPublicKey && storedWrapped) {
        try {
          const privateKey = await decryptItem<JsonWebKey>(vaultKey, storedWrapped);
          setPrivateKeyJwk(privateKey);
          setPublicKeyJwk(storedPublicKey);
          return;
        } catch {
          setPrivateKeyJwk(null);
          setPublicKeyJwk(null);
          return;
        }
      }
      const keyPair = await generateUserKeyPair();
      const wrappedPrivateKey = await encryptItem(vaultKey, keyPair.privateKey);
      await saveKeyPair({ publicKey: keyPair.publicKey, wrappedPrivateKey });
      setPrivateKeyJwk(keyPair.privateKey);
      setPublicKeyJwk(keyPair.publicKey);
    },
    [saveKeyPair]
  );

  const unlock = useCallback(
    async (pin: string) => {
      setIsBusy(true);
      try {
        const session = await requestVaultUnlock();
        const derivedKey = await deriveKey(pin, session.salt, session.kdf.iterations);
        const isCorrect = await verifyPin(derivedKey, session.verifier);
        if (!isCorrect) {
          await refetchMeta();
          throw new VaultWrongPinError();
        }
        await confirmVaultUnlock();
        await loadItems(derivedKey);
        await ensureSharingKeys(derivedKey, session.publicKey, session.wrappedPrivateKey);
        setKey(derivedKey);
        lastActivityRef.current = Date.now();
      } finally {
        setIsBusy(false);
      }
    },
    [loadItems, refetchMeta, ensureSharingKeys]
  );

  const saveItem = useCallback(
    async (category: VaultCategory, content: VaultItemContent, itemId?: string) => {
      if (!key) throw new Error('The vault is locked');
      setIsBusy(true);
      try {
        const ciphertext = await encryptItem(key, content);
        await saveVaultItem({ itemId: itemId ?? newItemId(), category, ciphertext });
        await loadItems(key);
      } finally {
        setIsBusy(false);
      }
    },
    [key, loadItems, saveVaultItem]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!key) throw new Error('The vault is locked');
      setIsBusy(true);
      try {
        await deleteVaultItem(itemId);
        await loadItems(key);
      } finally {
        setIsBusy(false);
      }
    },
    [key, loadItems, deleteVaultItem]
  );

  const changePin = useCallback(
    async (newPin: string) => {
      if (!key) throw new Error('The vault is locked');
      setIsBusy(true);
      try {
        const salt = generateSalt();
        const nextKey = await deriveKey(newPin, salt, VAULT_KDF_ITERATIONS);
        const verifier = await createVerifier(nextKey);
        const rewrappedPrivateKey = privateKeyJwk
          ? await encryptItem(nextKey, privateKeyJwk)
          : null;
        const reencryptedItems = await Promise.all(
          items.map(async (item) => ({
            id: item.id,
            category: item.category,
            createdAt: item.createdAt,
            ciphertext: await encryptItem(nextKey, item.content),
          }))
        );
        await rekeyVault({
          salt,
          verifier,
          iterations: VAULT_KDF_ITERATIONS,
          wrappedPrivateKey: rewrappedPrivateKey,
          items: reencryptedItems,
        });
        setKey(nextKey);
        setDamagedIds([]);
      } finally {
        setIsBusy(false);
      }
    },
    [key, items, rekeyVault, privateKeyJwk]
  );

  const resolveWalletKey = useCallback(
    async (walletId: string, wrappedWalletKey: WrappedWalletKey | null, keyEpoch: number) => {
      const cacheKey = `${walletId}:${keyEpoch}`;
      const cached = walletKeysRef.current.get(cacheKey);
      if (cached) return cached;
      if (!wrappedWalletKey || !privateKeyJwk) return null;
      try {
        const walletKey = await unwrapKeyWithPrivateKey(wrappedWalletKey, privateKeyJwk);
        walletKeysRef.current.set(cacheKey, walletKey);
        return walletKey;
      } catch {
        return null;
      }
    },
    [privateKeyJwk]
  );

  const destroy = useCallback(async () => {
    setIsBusy(true);
    try {
      await destroyVault();
      lock();
    } finally {
      setIsBusy(false);
    }
  }, [destroyVault, lock]);

  useEffect(() => {
    if (!key) return;
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActivity));
    const interval = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= VAULT_IDLE_LOCK_MS) lock();
    }, IDLE_CHECK_INTERVAL_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActivity));
      window.clearInterval(interval);
    };
  }, [key, lock]);

  let status: VaultStatus = 'loading';
  if (cryptoAvailable === false) status = 'unsupported';
  else if (cryptoAvailable === true && !isMetaLoading) {
    if (key) status = 'unlocked';
    else status = meta?.exists ? 'locked' : 'setup';
  }

  return {
    status,
    items,
    damagedIds,
    isBusy,
    lockedUntil: meta?.lockedUntil ?? null,
    attemptsRemaining: meta?.attemptsRemaining,
    publicKeyJwk,
    privateKeyJwk,
    hasSharingKeys: Boolean(publicKeyJwk && privateKeyJwk),
    resolveWalletKey,
    createVault,
    unlock,
    lock,
    saveItem,
    removeItem,
    changePin,
    destroy,
  };
}
