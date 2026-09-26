import { webcrypto, randomBytes as nodeRandomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { createVaultCrypto, EcJwk } from '../crypto';
import { createNoblePrimitives } from '../noblePrimitives';

type WebVault = typeof import('../../../../../frontend/src/utils/vaultCrypto');

const TEST_ITERATIONS = 1000;
const PIN = '482913';

const core = createVaultCrypto(
  createNoblePrimitives((length) => new Uint8Array(nodeRandomBytes(length)))
);
let web: WebVault;

beforeAll(async () => {
  Object.defineProperty(globalThis, 'window', {
    value: { isSecureContext: true, crypto: webcrypto },
    configurable: true,
  });
  web = await import('../../../../../frontend/src/utils/vaultCrypto');
});

async function rawKeyFromWebPin(salt: string): Promise<Uint8Array> {
  const base = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(PIN),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await webcrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: Buffer.from(salt, 'base64'),
      iterations: TEST_ITERATIONS,
      hash: 'SHA-256',
    },
    base,
    256
  );
  return new Uint8Array(bits);
}

describe('vault crypto matches the web implementation', () => {
  it('derives the same PIN key as WebCrypto PBKDF2', async () => {
    const salt = web.generateSalt();
    const coreKey = await core.deriveKey(PIN, salt, TEST_ITERATIONS);
    expect(Buffer.from(coreKey)).toEqual(Buffer.from(await rawKeyFromWebPin(salt)));
  });

  it('reads a verifier and items written by the web', async () => {
    const salt = web.generateSalt();
    const webKey = await web.deriveKey(PIN, salt, TEST_ITERATIONS);
    const verifier = await web.createVerifier(webKey);
    const item = { fields: { bankName: 'HDFC', accountNumber: '0012' }, customFields: [] };
    const envelope = await web.encryptItem(webKey, item);

    const coreKey = await core.deriveKey(PIN, salt, TEST_ITERATIONS);
    expect(core.verifyPin(coreKey, verifier)).toBe(true);
    expect(core.decryptItem(coreKey, envelope)).toEqual(item);
    const wrongKey = await core.deriveKey('000000', salt, TEST_ITERATIONS);
    expect(core.verifyPin(wrongKey, verifier)).toBe(false);
  });

  it('writes a verifier and items the web can read', async () => {
    const salt = core.generateSalt();
    const coreKey = await core.deriveKey(PIN, salt, TEST_ITERATIONS);
    const item = {
      fields: { cardNumber: '4111 1111 1111 1111' },
      customFields: [{ label: 'x', value: 'y', secret: true }],
    };
    const verifier = core.createVerifier(coreKey);
    const envelope = core.encryptItem(coreKey, item);

    const webKey = await web.deriveKey(PIN, salt, TEST_ITERATIONS);
    expect(await web.verifyPin(webKey, verifier)).toBe(true);
    expect(await web.decryptItem(webKey, envelope)).toEqual(item);
  });

  it('unwraps a wallet key the web wrapped, and the reverse', async () => {
    const webPair = await web.generateUserKeyPair();
    const corePair = core.generateUserKeyPair();

    const webWalletKey = await web.generateWalletKey();
    const webWalletRaw = await web.exportWalletKeyRaw(webWalletKey);
    const wrappedForCore = await web.wrapKeyForPublicKey(
      webWalletKey,
      corePair.publicKey as JsonWebKey
    );
    const unwrappedByCore = core.unwrapKeyWithPrivateKey(
      wrappedForCore as { epk: EcJwk; wrapped: string },
      corePair.privateKey
    );
    expect(core.walletKeyToBase64(unwrappedByCore)).toBe(webWalletRaw);

    const coreWalletKey = core.generateWalletKey();
    const wrappedForWeb = core.wrapKeyForPublicKey(coreWalletKey, webPair.publicKey as EcJwk);
    const unwrappedByWeb = await web.unwrapKeyWithPrivateKey(
      wrappedForWeb as unknown as { epk: JsonWebKey; wrapped: string },
      webPair.privateKey
    );
    expect(await web.exportWalletKeyRaw(unwrappedByWeb)).toBe(
      core.walletKeyToBase64(coreWalletKey)
    );
  });

  it('produces a private JWK the web can import, stored under the vault key', async () => {
    const salt = core.generateSalt();
    const coreKey = await core.deriveKey(PIN, salt, TEST_ITERATIONS);
    const pair = core.generateUserKeyPair();
    const wrappedPrivateKey = core.encryptItem(coreKey, pair.privateKey);

    const webKey = await web.deriveKey(PIN, salt, TEST_ITERATIONS);
    const privateJwk = await web.decryptItem<JsonWebKey>(webKey, wrappedPrivateKey);
    const walletKey = await web.generateWalletKey();
    const wrapped = await web.wrapKeyForPublicKey(walletKey, pair.publicKey as JsonWebKey);
    const unwrapped = await web.unwrapKeyWithPrivateKey(wrapped, privateJwk);
    expect(await web.exportWalletKeyRaw(unwrapped)).toBe(await web.exportWalletKeyRaw(walletKey));
  });

  it('reads a private key the web wrapped under the vault key', async () => {
    const salt = web.generateSalt();
    const webKey = await web.deriveKey(PIN, salt, TEST_ITERATIONS);
    const webPair = await web.generateUserKeyPair();
    const wrappedPrivateKey = await web.encryptItem(webKey, webPair.privateKey);

    const coreKey = await core.deriveKey(PIN, salt, TEST_ITERATIONS);
    const privateJwk = core.decryptItem<EcJwk>(coreKey, wrappedPrivateKey);
    const walletKey = await web.generateWalletKey();
    const wrapped = await web.wrapKeyForPublicKey(walletKey, webPair.publicKey);
    const unwrapped = core.unwrapKeyWithPrivateKey(
      wrapped as { epk: EcJwk; wrapped: string },
      privateJwk
    );
    expect(core.walletKeyToBase64(unwrapped)).toBe(await web.exportWalletKeyRaw(walletKey));
  });

  it('shares wallet entries encrypted under the raw wallet key', async () => {
    const webWalletKey = await web.generateWalletKey();
    const raw = core.walletKeyFromBase64(await web.exportWalletKeyRaw(webWalletKey));
    const name = { name: 'Family' };
    expect(core.decryptItem(raw, await web.encryptItem(webWalletKey, name))).toEqual(name);
    expect(await web.decryptItem(webWalletKey, core.encryptItem(raw, name))).toEqual(name);
  });

  it('rejects tampered envelopes', async () => {
    const key = core.generateWalletKey();
    const envelope = core.encryptItem(key, { a: 1 });
    const [version, iv, ciphertext] = envelope.split('.');
    const flipped = Buffer.from(ciphertext, 'base64');
    flipped[0] ^= 1;
    expect(() => core.decryptItem(key, `${version}.${iv}.${flipped.toString('base64')}`)).toThrow();
    expect(() => core.decryptItem(key, 'v2.a.b')).toThrow();
  });
});
