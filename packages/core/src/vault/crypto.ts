export const VAULT_KDF_ITERATIONS = 310_000;
export const VAULT_SALT_BYTES = 16;
export const VAULT_IV_BYTES = 12;
export const VAULT_KEY_BYTES = 32;
export const VAULT_VERIFIER_MAGIC = 'myfinances-vault-verifier-v1';

const ENVELOPE_VERSION = 'v1';
const ENVELOPE_PART_COUNT = 3;
const WRAP_INFO = 'myfinances-wallet-key-wrap-v1';
const P256_COORDINATE_BYTES = 32;
const UNCOMPRESSED_POINT_PREFIX = 0x04;
const EC_PRIVATE_KEY_OPS = ['deriveKey', 'deriveBits'];

export interface VaultPrimitives {
  randomBytes(length: number): Uint8Array;
  pbkdf2Sha256(
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    length: number
  ): Promise<Uint8Array>;
  hkdfSha256(secret: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Uint8Array;
  aesGcmEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array;
  aesGcmDecrypt(key: Uint8Array, iv: Uint8Array, ciphertextWithTag: Uint8Array): Uint8Array;
  p256RandomPrivateKey(): Uint8Array;
  p256PublicKey(privateKey: Uint8Array): Uint8Array;
  p256SharedSecretX(privateKey: Uint8Array, publicKeyUncompressed: Uint8Array): Uint8Array;
}

export interface EcJwk {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
  d?: string;
  ext?: boolean;
  key_ops?: string[];
}

export interface WrappedKey {
  epk: EcJwk;
  wrapped: string;
}

export interface UserKeyPairMaterial {
  publicKey: EcJwk;
  privateKey: EcJwk;
}

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

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = new Map([...BASE64_ALPHABET].map((char, index) => [char, index]));

export function bytesToBase64(bytes: Uint8Array): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    output += BASE64_ALPHABET[(chunk >> 18) & 63];
    output += BASE64_ALPHABET[(chunk >> 12) & 63];
    output += i + 1 < bytes.length ? BASE64_ALPHABET[(chunk >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? BASE64_ALPHABET[chunk & 63] : '=';
  }
  return output;
}

export function base64ToBytes(value: string): Uint8Array {
  const clean = value.replace(/=+$/, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const char of clean) {
    const sextet = BASE64_LOOKUP.get(char);
    if (sextet === undefined) throw new VaultCorruptDataError('Invalid base64 data');
    buffer = (buffer << 6) | sextet;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }
  return bytes;
}

export function base64ToBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBase64(value: string): string {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalised.length % 4 === 0 ? '' : '='.repeat(4 - (normalised.length % 4));
  return normalised + padding;
}

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

function sealEnvelope(iv: Uint8Array, ciphertext: Uint8Array): string {
  return [ENVELOPE_VERSION, bytesToBase64(iv), bytesToBase64(ciphertext)].join('.');
}

function openEnvelope(
  envelope: string,
  formatError: string
): { iv: Uint8Array; ciphertext: Uint8Array } {
  const parts = envelope.split('.');
  if (parts.length !== ENVELOPE_PART_COUNT || parts[0] !== ENVELOPE_VERSION) {
    throw new VaultCorruptDataError(formatError);
  }
  return { iv: base64ToBytes(parts[1]), ciphertext: base64ToBytes(parts[2]) };
}

function publicKeyToJwk(uncompressed: Uint8Array): EcJwk {
  return {
    kty: 'EC',
    crv: 'P-256',
    x: base64ToBase64Url(bytesToBase64(uncompressed.slice(1, 1 + P256_COORDINATE_BYTES))),
    y: base64ToBase64Url(bytesToBase64(uncompressed.slice(1 + P256_COORDINATE_BYTES))),
    ext: true,
    key_ops: [],
  };
}

function jwkToPublicKey(jwk: EcJwk): Uint8Array {
  const x = base64ToBytes(base64UrlToBase64(jwk.x));
  const y = base64ToBytes(base64UrlToBase64(jwk.y));
  const point = new Uint8Array(1 + P256_COORDINATE_BYTES * 2);
  point[0] = UNCOMPRESSED_POINT_PREFIX;
  point.set(x, 1);
  point.set(y, 1 + P256_COORDINATE_BYTES);
  return point;
}

function jwkToPrivateKey(jwk: EcJwk): Uint8Array {
  if (!jwk.d) throw new VaultCorruptDataError('Private key is missing');
  return base64ToBytes(base64UrlToBase64(jwk.d));
}

export function createVaultCrypto(primitives: VaultPrimitives) {
  function encryptBytes(key: Uint8Array, plaintext: Uint8Array): string {
    const iv = primitives.randomBytes(VAULT_IV_BYTES);
    return sealEnvelope(iv, primitives.aesGcmEncrypt(key, iv, plaintext));
  }

  function decryptBytes(key: Uint8Array, envelope: string, formatError: string, failure: string) {
    const { iv, ciphertext } = openEnvelope(envelope, formatError);
    try {
      return primitives.aesGcmDecrypt(key, iv, ciphertext);
    } catch {
      throw new VaultCorruptDataError(failure);
    }
  }

  function encryptItem(key: Uint8Array, value: unknown): string {
    return encryptBytes(key, utf8Encoder.encode(JSON.stringify(value)));
  }

  function decryptItem<T>(key: Uint8Array, envelope: string): T {
    const plaintext = decryptBytes(
      key,
      envelope,
      'Unrecognised vault entry format',
      'This entry could not be decrypted'
    );
    try {
      return JSON.parse(utf8Decoder.decode(plaintext)) as T;
    } catch {
      throw new VaultCorruptDataError('Vault entry decrypted to invalid data');
    }
  }

  function keyEncryptionKey(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
    const sharedSecret = primitives.p256SharedSecretX(privateKey, publicKey);
    return primitives.hkdfSha256(
      sharedSecret,
      new Uint8Array(0),
      utf8Encoder.encode(WRAP_INFO),
      VAULT_KEY_BYTES
    );
  }

  return {
    generateSalt(): string {
      return bytesToBase64(primitives.randomBytes(VAULT_SALT_BYTES));
    },

    deriveKey(pin: string, saltB64: string, iterations: number): Promise<Uint8Array> {
      return primitives.pbkdf2Sha256(
        utf8Encoder.encode(pin),
        base64ToBytes(saltB64),
        iterations,
        VAULT_KEY_BYTES
      );
    },

    encryptItem,
    decryptItem,

    createVerifier(key: Uint8Array): string {
      return encryptItem(key, { magic: VAULT_VERIFIER_MAGIC, createdAt: Date.now() });
    },

    verifyPin(key: Uint8Array, verifier: string): boolean {
      try {
        return decryptItem<{ magic?: string }>(key, verifier).magic === VAULT_VERIFIER_MAGIC;
      } catch {
        return false;
      }
    },

    generateUserKeyPair(): UserKeyPairMaterial {
      const privateKey = primitives.p256RandomPrivateKey();
      const publicJwk = publicKeyToJwk(primitives.p256PublicKey(privateKey));
      return {
        publicKey: { ...publicJwk, key_ops: [] },
        privateKey: {
          ...publicJwk,
          d: base64ToBase64Url(bytesToBase64(privateKey)),
          key_ops: EC_PRIVATE_KEY_OPS,
        },
      };
    },

    generateWalletKey(): Uint8Array {
      return primitives.randomBytes(VAULT_KEY_BYTES);
    },

    wrapKeyForPublicKey(walletKey: Uint8Array, recipientPublicJwk: EcJwk): WrappedKey {
      const ephemeralPrivate = primitives.p256RandomPrivateKey();
      const kek = keyEncryptionKey(ephemeralPrivate, jwkToPublicKey(recipientPublicJwk));
      return {
        epk: publicKeyToJwk(primitives.p256PublicKey(ephemeralPrivate)),
        wrapped: encryptBytes(kek, walletKey),
      };
    },

    unwrapKeyWithPrivateKey(wrappedKey: WrappedKey, recipientPrivateJwk: EcJwk): Uint8Array {
      const kek = keyEncryptionKey(
        jwkToPrivateKey(recipientPrivateJwk),
        jwkToPublicKey(wrappedKey.epk)
      );
      return decryptBytes(
        kek,
        wrappedKey.wrapped,
        'Unrecognised wallet key format',
        'This wallet key could not be unwrapped'
      );
    },

    walletKeyToBase64(walletKey: Uint8Array): string {
      return bytesToBase64(walletKey);
    },

    walletKeyFromBase64(rawB64: string): Uint8Array {
      return base64ToBytes(rawB64);
    },
  };
}

export type VaultCrypto = ReturnType<typeof createVaultCrypto>;
