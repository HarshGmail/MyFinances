const ENVELOPE_VERSION = 'v1';
const ENVELOPE_PART_COUNT = 3;
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const GCM_TAG_LENGTH = 128;
const KDF_ALGORITHM = 'PBKDF2';
const KDF_HASH = 'SHA-256';

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
