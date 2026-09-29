import { randomFillSync, randomBytes as nodeRandomBytes } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createVaultCrypto } from '../crypto';
import { createNoblePrimitives } from '../noblePrimitives';

const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

function setGlobalCrypto(value: unknown) {
  Object.defineProperty(globalThis, 'crypto', { value, configurable: true });
}

function vaultCrypto() {
  return createVaultCrypto(
    createNoblePrimitives((length) => new Uint8Array(nodeRandomBytes(length)))
  );
}

function roundTrip() {
  const vault = vaultCrypto();
  const pair = vault.generateUserKeyPair();
  const walletKey = vault.generateWalletKey();
  const wrapped = vault.wrapKeyForPublicKey(walletKey, pair.publicKey);
  return (
    vault.walletKeyToBase64(vault.unwrapKeyWithPrivateKey(wrapped, pair.privateKey)) ===
    vault.walletKeyToBase64(walletKey)
  );
}

afterEach(() => {
  if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
});

describe('vault crypto on a runtime like Hermes', () => {
  it('needs a global getRandomValues, because noble blinds secret scalar multiplication', () => {
    setGlobalCrypto(undefined);
    expect(roundTrip).toThrow('crypto.getRandomValues must be defined');
  });

  it('works once only getRandomValues is provided, as mobile installs at startup', () => {
    setGlobalCrypto({
      getRandomValues: (array: Uint8Array) => randomFillSync(array),
    });
    expect(roundTrip()).toBe(true);
  });
});
