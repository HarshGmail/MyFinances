import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const VAULT_CATEGORIES = ['bank', 'card', 'insurance', 'other'] as const;

export const VAULT_MAX_ITEMS = 500;
export const VAULT_MAX_CIPHERTEXT_LENGTH = 200_000;

export const VAULT_KDF_ALGO = 'PBKDF2-SHA256';

const ciphertextField = z.string().min(1).max(VAULT_MAX_CIPHERTEXT_LENGTH);
const saltField = z.string().min(16).max(64);
const verifierField = z.string().min(1).max(10_000);
const iterationsField = z.number().int().min(100_000).max(1_000_000);

export const publicKeySchema = z.record(z.unknown());
export const wrappedPrivateKeyField = z.string().min(1).max(10_000);

export const vaultItemSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(VAULT_CATEGORIES),
  ciphertext: ciphertextField,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const vaultSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  salt: saltField,
  verifier: verifierField,
  kdf: z.object({
    algo: z.literal(VAULT_KDF_ALGO),
    iterations: iterationsField,
  }),
  keyEpoch: z.number().int().nonnegative(),
  publicKey: publicKeySchema.nullable(),
  wrappedPrivateKey: wrappedPrivateKeyField.nullable(),
  items: z.array(vaultItemSchema).max(VAULT_MAX_ITEMS),
  failedAttempts: z.number().int().nonnegative(),
  lockedUntil: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const vaultInitBodySchema = z.object({
  salt: saltField,
  verifier: verifierField,
  iterations: iterationsField,
  publicKey: publicKeySchema.optional(),
  wrappedPrivateKey: wrappedPrivateKeyField.optional(),
});

export const vaultKeyPairBodySchema = z.object({
  publicKey: publicKeySchema,
  wrappedPrivateKey: wrappedPrivateKeyField,
});

export const vaultItemBodySchema = z.object({
  category: z.enum(VAULT_CATEGORIES),
  ciphertext: ciphertextField,
});

export const vaultRekeyBodySchema = z.object({
  salt: saltField,
  verifier: verifierField,
  iterations: iterationsField,
  wrappedPrivateKey: wrappedPrivateKeyField.nullable().optional(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        category: z.enum(VAULT_CATEGORIES),
        ciphertext: ciphertextField,
        createdAt: z.coerce.date(),
      })
    )
    .max(VAULT_MAX_ITEMS),
});

export type Vault = z.infer<typeof vaultSchema>;
export type VaultItem = z.infer<typeof vaultItemSchema>;
export type VaultCategory = (typeof VAULT_CATEGORIES)[number];
