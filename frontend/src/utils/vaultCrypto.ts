const ENVELOPE_VERSION = 'v1';
const ENVELOPE_PART_COUNT = 3;
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const GCM_TAG_LENGTH = 128;
const KDF_ALGORITHM = 'PBKDF2';
const KDF_HASH = 'SHA-256';
const ECDH_ALGORITHM = 'ECDH';
const ECDH_CURVE = 'P-256';
const HKDF_ALGORITHM = 'HKDF';
const WRAP_INFO = 'myfinances-wallet-key-wrap-v1';

export const VAULT_KDF_ITERATIONS = 310_000;
export const VAULT_SALT_BYTES = 16;
export const VAULT_IV_BYTES = 12;
export const VAULT_VERIFIER_MAGIC = 'myfinances-vault-verifier-v1';

export class VaultWrongPinError extends Error {
  constructor() {
    super('Incorrect PIN');
    this.name = 'VaultWrongPinError';
  }
}

export class VaultCorruptDataError extends Error {
  constructor(message = 'This entry could not be decrypted') {
    super(message);
    this.name = 'VaultCorruptDataError';
  }
}

export class VaultUnsupportedError extends Error {
  constructor() {
    super('The vault needs a secure connection (HTTPS or localhost)');
    this.name = 'VaultUnsupportedError';
  }
}

export function isVaultCryptoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof window.crypto?.subtle?.deriveKey === 'function' &&
    typeof window.crypto?.randomUUID === 'function'
  );
}

function requireSubtleCrypto(): SubtleCrypto {
  if (!isVaultCryptoAvailable()) throw new VaultUnsupportedError();
  return window.crypto.subtle;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  if (!isVaultCryptoAvailable()) throw new VaultUnsupportedError();
  return window.crypto.getRandomValues(new Uint8Array(length));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generateSalt(): string {
  return bytesToBase64(randomBytes(VAULT_SALT_BYTES));
}

export function newItemId(): string {
  if (!isVaultCryptoAvailable()) throw new VaultUnsupportedError();
  return window.crypto.randomUUID();
}

export async function deriveKey(
  pin: string,
  saltB64: string,
  iterations: number
): Promise<CryptoKey> {
  const subtle = requireSubtleCrypto();
  const pinAsBaseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    KDF_ALGORITHM,
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    { name: KDF_ALGORITHM, salt: base64ToBytes(saltB64), iterations, hash: KDF_HASH },
    pinAsBaseKey,
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptItem(key: CryptoKey, value: unknown): Promise<string> {
  const subtle = requireSubtleCrypto();
  const iv = randomBytes(VAULT_IV_BYTES);
  const ciphertext = await subtle.encrypt(
    { name: AES_ALGORITHM, iv, tagLength: GCM_TAG_LENGTH },
    key,
    new TextEncoder().encode(JSON.stringify(value))
  );
  return [ENVELOPE_VERSION, bytesToBase64(iv), bytesToBase64(new Uint8Array(ciphertext))].join('.');
}

export async function decryptItem<T>(key: CryptoKey, envelope: string): Promise<T> {
  const subtle = requireSubtleCrypto();
  const parts = envelope.split('.');
  if (parts.length !== ENVELOPE_PART_COUNT || parts[0] !== ENVELOPE_VERSION) {
    throw new VaultCorruptDataError('Unrecognised vault entry format');
  }

  let plaintext: ArrayBuffer;
  try {
    plaintext = await subtle.decrypt(
      { name: AES_ALGORITHM, iv: base64ToBytes(parts[1]), tagLength: GCM_TAG_LENGTH },
      key,
      base64ToBytes(parts[2])
    );
  } catch {
    throw new VaultCorruptDataError();
  }

  try {
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new VaultCorruptDataError('Vault entry decrypted to invalid data');
  }
}

export async function createVerifier(key: CryptoKey): Promise<string> {
  return encryptItem(key, { magic: VAULT_VERIFIER_MAGIC, createdAt: Date.now() });
}

export async function verifyPin(key: CryptoKey, verifier: string): Promise<boolean> {
  try {
    const decoded = await decryptItem<{ magic?: string }>(key, verifier);
    return decoded.magic === VAULT_VERIFIER_MAGIC;
  } catch {
    return false;
  }
}

export interface WrappedKey {
  epk: JsonWebKey;
  wrapped: string;
}

export interface UserKeyPairMaterial {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export async function generateUserKeyPair(): Promise<UserKeyPairMaterial> {
  const subtle = requireSubtleCrypto();
  const pair = await subtle.generateKey({ name: ECDH_ALGORITHM, namedCurve: ECDH_CURVE }, true, [
    'deriveKey',
    'deriveBits',
  ]);
  const [publicKey, privateKey] = await Promise.all([
    subtle.exportKey('jwk', pair.publicKey),
    subtle.exportKey('jwk', pair.privateKey),
  ]);
  return { publicKey, privateKey };
}

async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  const subtle = requireSubtleCrypto();
  return subtle.importKey(
    'jwk',
    { ...jwk, key_ops: [], ext: true },
    { name: ECDH_ALGORITHM, namedCurve: ECDH_CURVE },
    true,
    []
  );
}

async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  const subtle = requireSubtleCrypto();
  return subtle.importKey('jwk', jwk, { name: ECDH_ALGORITHM, namedCurve: ECDH_CURVE }, false, [
    'deriveBits',
  ]);
}

async function deriveKeyEncryptionKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  const subtle = requireSubtleCrypto();
  const sharedSecret = await subtle.deriveBits(
    { name: ECDH_ALGORITHM, public: publicKey },
    privateKey,
    256
  );
  const hkdfBaseKey = await subtle.importKey('raw', sharedSecret, HKDF_ALGORITHM, false, [
    'deriveKey',
  ]);
  return subtle.deriveKey(
    {
      name: HKDF_ALGORITHM,
      hash: KDF_HASH,
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(WRAP_INFO),
    },
    hkdfBaseKey,
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function generateWalletKey(): Promise<CryptoKey> {
  const subtle = requireSubtleCrypto();
  return subtle.generateKey({ name: AES_ALGORITHM, length: AES_KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function exportWalletKeyRaw(walletKey: CryptoKey): Promise<string> {
  const subtle = requireSubtleCrypto();
  return bytesToBase64(new Uint8Array(await subtle.exportKey('raw', walletKey)));
}

export async function importWalletKeyRaw(rawB64: string): Promise<CryptoKey> {
  const subtle = requireSubtleCrypto();
  return subtle.importKey(
    'raw',
    base64ToBytes(rawB64),
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function wrapKeyForPublicKey(
  walletKey: CryptoKey,
  recipientPublicJwk: JsonWebKey
): Promise<WrappedKey> {
  const subtle = requireSubtleCrypto();
  const ephemeral = await subtle.generateKey(
    { name: ECDH_ALGORITHM, namedCurve: ECDH_CURVE },
    true,
    ['deriveBits']
  );
  const recipientPublicKey = await importPublicKey(recipientPublicJwk);
  const keyEncryptionKey = await deriveKeyEncryptionKey(ephemeral.privateKey, recipientPublicKey);
  const rawWalletKey = await subtle.exportKey('raw', walletKey);
  const iv = randomBytes(VAULT_IV_BYTES);
  const wrapped = await subtle.encrypt(
    { name: AES_ALGORITHM, iv, tagLength: GCM_TAG_LENGTH },
    keyEncryptionKey,
    rawWalletKey
  );
  return {
    epk: await subtle.exportKey('jwk', ephemeral.publicKey),
    wrapped: [ENVELOPE_VERSION, bytesToBase64(iv), bytesToBase64(new Uint8Array(wrapped))].join(
      '.'
    ),
  };
}

export async function unwrapKeyWithPrivateKey(
  wrappedKey: WrappedKey,
  recipientPrivateJwk: JsonWebKey
): Promise<CryptoKey> {
  const subtle = requireSubtleCrypto();
  const parts = wrappedKey.wrapped.split('.');
  if (parts.length !== ENVELOPE_PART_COUNT || parts[0] !== ENVELOPE_VERSION) {
    throw new VaultCorruptDataError('Unrecognised wallet key format');
  }
  const privateKey = await importPrivateKey(recipientPrivateJwk);
  const ephemeralPublicKey = await importPublicKey(wrappedKey.epk);
  const keyEncryptionKey = await deriveKeyEncryptionKey(privateKey, ephemeralPublicKey);

  let rawWalletKey: ArrayBuffer;
  try {
    rawWalletKey = await subtle.decrypt(
      { name: AES_ALGORITHM, iv: base64ToBytes(parts[1]), tagLength: GCM_TAG_LENGTH },
      keyEncryptionKey,
      base64ToBytes(parts[2])
    );
  } catch {
    throw new VaultCorruptDataError('This wallet key could not be unwrapped');
  }

  return subtle.importKey(
    'raw',
    rawWalletKey,
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

export function encodeWalletKeyForLink(rawB64: string): string {
  return rawB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeWalletKeyFromLink(fragment: string): string {
  const normalised = fragment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalised.length % 4 === 0 ? '' : '='.repeat(4 - (normalised.length % 4));
  return normalised + padding;
}
