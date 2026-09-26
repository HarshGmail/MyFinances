import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  confirmVaultUnlock,
  fetchVaultItems,
  requestVaultUnlock,
  useDeleteVaultItemMutation,
  useDestroyVaultMutation,
  useInitVaultMutation,
  useRekeyVaultMutation,
  useSaveVaultItemMutation,
} from '@myfinances/core/api/mutations/vault';
import { useSaveVaultKeyPairMutation } from '@myfinances/core/api/mutations/wallets';
import { VAULT_META_QUERY_KEY } from '@myfinances/core/api/query/vault';
import type { VaultCategory, VaultItemContent } from '@myfinances/core/types';
import { EcJwk, VAULT_KDF_ITERATIONS, VaultWrongPinError } from '@myfinances/core/vault/crypto';
import type { VaultDecryptedItem } from '@myfinances/core/vault/vaultTypes';
import { newItemId, vaultCrypto } from './vaultCrypto';
import { clearBiometricPin } from './biometricPin';

export const VAULT_IDLE_LOCK_MS = 5 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 15 * 1000;

interface VaultSessionValue {
  isUnlocked: boolean;
  isBusy: boolean;
  items: VaultDecryptedItem[];
  damagedIds: string[];
  publicKey: EcJwk | null;
  privateKey: EcJwk | null;
  createVault: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<void>;
  verifyPinOnly: (pin: string) => Promise<void>;
  lock: () => void;
  markActivity: () => void;
  saveItem: (category: VaultCategory, content: VaultItemContent, itemId?: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  changePin: (newPin: string) => Promise<void>;
  destroy: () => Promise<void>;
  resolveWalletKey: (
    walletId: string,
    wrapped: { epk: EcJwk; wrapped: string } | null,
    keyEpoch: number
  ) => Uint8Array | null;
  encryptWithVaultKey: (value: unknown) => string;
}

const VaultSessionContext = createContext<VaultSessionValue | null>(null);

function wipe(bytes: Uint8Array | null) {
  bytes?.fill(0);
}

export function VaultSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const keyRef = useRef<Uint8Array | null>(null);
  const walletKeysRef = useRef(new Map<string, Uint8Array>());
  const lastActivityRef = useRef(Date.now());
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [items, setItems] = useState<VaultDecryptedItem[]>([]);
  const [damagedIds, setDamagedIds] = useState<string[]>([]);
  const [publicKey, setPublicKey] = useState<EcJwk | null>(null);
  const [privateKey, setPrivateKey] = useState<EcJwk | null>(null);

  const { mutateAsync: initVault } = useInitVaultMutation();
  const { mutateAsync: saveVaultItem } = useSaveVaultItemMutation();
  const { mutateAsync: deleteVaultItem } = useDeleteVaultItemMutation();
  const { mutateAsync: rekeyVault } = useRekeyVaultMutation();
  const { mutateAsync: destroyVault } = useDestroyVaultMutation();
  const { mutateAsync: saveKeyPair } = useSaveVaultKeyPairMutation();

  const lock = useCallback(() => {
    wipe(keyRef.current);
    keyRef.current = null;
    walletKeysRef.current.forEach(wipe);
    walletKeysRef.current.clear();
    setItems([]);
    setDamagedIds([]);
    setPrivateKey(null);
    setPublicKey(null);
    setIsUnlocked(false);
  }, []);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const requireKey = useCallback(() => {
    if (!keyRef.current) throw new Error('The vault is locked');
    return keyRef.current;
  }, []);

  const loadItems = useCallback(async (vaultKey: Uint8Array) => {
    const records = await fetchVaultItems();
    const decrypted: VaultDecryptedItem[] = [];
    const damaged: string[] = [];
    for (const record of records) {
      if (!record.ciphertext) {
        damaged.push(record.id);
        continue;
      }
      try {
        decrypted.push({
          id: record.id,
          category: record.category,
          content: vaultCrypto.decryptItem<VaultItemContent>(vaultKey, record.ciphertext),
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

  const ensureSharingKeys = useCallback(
    async (vaultKey: Uint8Array, storedPublic: EcJwk | null, storedWrapped: string | null) => {
      if (storedPublic && storedWrapped) {
        try {
          setPrivateKey(vaultCrypto.decryptItem<EcJwk>(vaultKey, storedWrapped));
          setPublicKey(storedPublic);
        } catch {
          setPrivateKey(null);
          setPublicKey(null);
        }
        return;
      }
      const pair = vaultCrypto.generateUserKeyPair();
      await saveKeyPair({
        publicKey: pair.publicKey as JsonWebKey,
        wrappedPrivateKey: vaultCrypto.encryptItem(vaultKey, pair.privateKey),
      });
      setPrivateKey(pair.privateKey);
      setPublicKey(pair.publicKey);
    },
    [saveKeyPair]
  );

  const deriveAndVerify = useCallback(
    async (pin: string) => {
      const session = await requestVaultUnlock();
      const derivedKey = await vaultCrypto.deriveKey(pin, session.salt, session.kdf.iterations);
      if (!vaultCrypto.verifyPin(derivedKey, session.verifier)) {
        wipe(derivedKey);
        await queryClient.invalidateQueries({ queryKey: VAULT_META_QUERY_KEY });
        throw new VaultWrongPinError();
      }
      await confirmVaultUnlock();
      return { derivedKey, session };
    },
    [queryClient]
  );

  const unlock = useCallback(
    async (pin: string) => {
      setIsBusy(true);
      try {
        const { derivedKey, session } = await deriveAndVerify(pin);
        await loadItems(derivedKey);
        await ensureSharingKeys(
          derivedKey,
          session.publicKey as EcJwk | null,
          session.wrappedPrivateKey
        );
        keyRef.current = derivedKey;
        lastActivityRef.current = Date.now();
        setIsUnlocked(true);
      } finally {
        setIsBusy(false);
      }
    },
    [deriveAndVerify, loadItems, ensureSharingKeys]
  );

  const verifyPinOnly = useCallback(
    async (pin: string) => {
      setIsBusy(true);
      try {
        const { derivedKey } = await deriveAndVerify(pin);
        wipe(derivedKey);
      } finally {
        setIsBusy(false);
      }
    },
    [deriveAndVerify]
  );

  const createVault = useCallback(
    async (pin: string) => {
      setIsBusy(true);
      try {
        const salt = vaultCrypto.generateSalt();
        const derivedKey = await vaultCrypto.deriveKey(pin, salt, VAULT_KDF_ITERATIONS);
        const pair = vaultCrypto.generateUserKeyPair();
        await initVault({
          salt,
          verifier: vaultCrypto.createVerifier(derivedKey),
          iterations: VAULT_KDF_ITERATIONS,
          publicKey: pair.publicKey as JsonWebKey,
          wrappedPrivateKey: vaultCrypto.encryptItem(derivedKey, pair.privateKey),
        });
        keyRef.current = derivedKey;
        setItems([]);
        setDamagedIds([]);
        setPrivateKey(pair.privateKey);
        setPublicKey(pair.publicKey);
        lastActivityRef.current = Date.now();
        setIsUnlocked(true);
      } finally {
        setIsBusy(false);
      }
    },
    [initVault]
  );

  const saveItem = useCallback(
    async (category: VaultCategory, content: VaultItemContent, itemId?: string) => {
      const vaultKey = requireKey();
      setIsBusy(true);
      try {
        await saveVaultItem({
          itemId: itemId ?? newItemId(),
          category,
          ciphertext: vaultCrypto.encryptItem(vaultKey, content),
        });
        await loadItems(vaultKey);
      } finally {
        setIsBusy(false);
      }
    },
    [requireKey, saveVaultItem, loadItems]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const vaultKey = requireKey();
      setIsBusy(true);
      try {
        await deleteVaultItem(itemId);
        await loadItems(vaultKey);
      } finally {
        setIsBusy(false);
      }
    },
    [requireKey, deleteVaultItem, loadItems]
  );

  const changePin = useCallback(
    async (newPin: string) => {
      requireKey();
      setIsBusy(true);
      try {
        const salt = vaultCrypto.generateSalt();
        const nextKey = await vaultCrypto.deriveKey(newPin, salt, VAULT_KDF_ITERATIONS);
        await rekeyVault({
          salt,
          verifier: vaultCrypto.createVerifier(nextKey),
          iterations: VAULT_KDF_ITERATIONS,
          wrappedPrivateKey: privateKey ? vaultCrypto.encryptItem(nextKey, privateKey) : null,
          items: items.map((item) => ({
            id: item.id,
            category: item.category,
            createdAt: item.createdAt,
            ciphertext: vaultCrypto.encryptItem(nextKey, item.content),
          })),
        });
        wipe(keyRef.current);
        keyRef.current = nextKey;
        setDamagedIds([]);
        await clearBiometricPin();
      } finally {
        setIsBusy(false);
      }
    },
    [requireKey, rekeyVault, privateKey, items]
  );

  const destroy = useCallback(async () => {
    setIsBusy(true);
    try {
      await destroyVault();
      await clearBiometricPin();
      lock();
    } finally {
      setIsBusy(false);
    }
  }, [destroyVault, lock]);

  const resolveWalletKey = useCallback(
    (walletId: string, wrapped: { epk: EcJwk; wrapped: string } | null, keyEpoch: number) => {
      const cacheKey = `${walletId}:${keyEpoch}`;
      const cached = walletKeysRef.current.get(cacheKey);
      if (cached) return cached;
      if (!wrapped || !privateKey) return null;
      try {
        const walletKey = vaultCrypto.unwrapKeyWithPrivateKey(wrapped, privateKey);
        walletKeysRef.current.set(cacheKey, walletKey);
        return walletKey;
      } catch {
        return null;
      }
    },
    [privateKey]
  );

  const encryptWithVaultKey = useCallback(
    (value: unknown) => vaultCrypto.encryptItem(requireKey(), value),
    [requireKey]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') lock();
    });
    return () => subscription.remove();
  }, [lock]);

  useEffect(() => {
    if (!isUnlocked) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= VAULT_IDLE_LOCK_MS) lock();
    }, IDLE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isUnlocked, lock]);

  return (
    <VaultSessionContext.Provider
      value={{
        isUnlocked,
        isBusy,
        items,
        damagedIds,
        publicKey,
        privateKey,
        createVault,
        unlock,
        verifyPinOnly,
        lock,
        markActivity,
        saveItem,
        removeItem,
        changePin,
        destroy,
        resolveWalletKey,
        encryptWithVaultKey,
      }}
    >
      {children}
    </VaultSessionContext.Provider>
  );
}

export function useVaultSession(): VaultSessionValue {
  const value = useContext(VaultSessionContext);
  if (!value) throw new Error('useVaultSession must be used inside VaultSessionProvider');
  return value;
}
