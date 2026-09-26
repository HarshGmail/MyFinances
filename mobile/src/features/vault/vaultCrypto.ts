import { getRandomValues, pbkdf2 } from 'react-native-quick-crypto';
import { createVaultCrypto } from '@myfinances/core/vault/crypto';
import { createNoblePrimitives } from '@myfinances/core/vault/noblePrimitives';

function randomBytes(length: number): Uint8Array {
  return getRandomValues(new Uint8Array(length)) as Uint8Array;
}

function nativePbkdf2Sha256(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  length: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, iterations, length, 'sha256', (error, derived) => {
      if (error || !derived) reject(error ?? new Error('Key derivation failed'));
      else resolve(new Uint8Array(derived));
    });
  });
}

export const vaultCrypto = createVaultCrypto(
  createNoblePrimitives(randomBytes, nativePbkdf2Sha256)
);

const UUID_BYTES = 16;
const UUID_VERSION_BYTE = 6;
const UUID_VARIANT_BYTE = 8;
const UUID_V4_VERSION_BITS = 0x40;
const UUID_RFC4122_VARIANT_BITS = 0x80;

export function newItemId(): string {
  const bytes = randomBytes(UUID_BYTES);
  bytes[UUID_VERSION_BYTE] = (bytes[UUID_VERSION_BYTE] & 0x0f) | UUID_V4_VERSION_BITS;
  bytes[UUID_VARIANT_BYTE] = (bytes[UUID_VARIANT_BYTE] & 0x3f) | UUID_RFC4122_VARIANT_BITS;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
