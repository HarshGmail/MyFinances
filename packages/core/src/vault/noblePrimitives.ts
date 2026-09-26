import { gcm } from '@noble/ciphers/aes.js';
import { p256 } from '@noble/curves/nist.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import type { VaultPrimitives } from './crypto';

const COMPRESSION_PREFIX_BYTES = 1;

export function createNoblePrimitives(
  randomBytes: (length: number) => Uint8Array,
  pbkdf2Sha256?: VaultPrimitives['pbkdf2Sha256']
): VaultPrimitives {
  return {
    randomBytes,
    pbkdf2Sha256:
      pbkdf2Sha256 ??
      ((password, salt, iterations, length) =>
        pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: length })),
    hkdfSha256: (secret, salt, info, length) => hkdf(sha256, secret, salt, info, length),
    aesGcmEncrypt: (key, iv, plaintext) => gcm(key, iv).encrypt(plaintext),
    aesGcmDecrypt: (key, iv, ciphertext) => gcm(key, iv).decrypt(ciphertext),
    p256RandomPrivateKey: () => p256.utils.randomSecretKey(),
    p256PublicKey: (privateKey) => p256.getPublicKey(privateKey, false),
    p256SharedSecretX: (privateKey, publicKey) =>
      p256.getSharedSecret(privateKey, publicKey).slice(COMPRESSION_PREFIX_BYTES),
  };
}
