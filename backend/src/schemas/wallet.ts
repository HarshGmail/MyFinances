import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { VAULT_CATEGORIES, VAULT_MAX_CIPHERTEXT_LENGTH } from './vault';

export const WALLET_ROLES = ['owner', 'member'] as const;
export const WALLET_MEMBER_STATUSES = ['pending', 'active'] as const;

export const WALLET_MAX_ITEMS = 300;
export const WALLET_MAX_MEMBERS = 50;
export const WALLET_INVITE_MAX_USES = 25;
export const WALLET_INVITE_MAX_TTL_DAYS = 30;

const ciphertextField = z.string().min(1).max(VAULT_MAX_CIPHERTEXT_LENGTH);
const jwkField = z.record(z.unknown());

export const wrappedKeySchema = z.object({
  epk: jwkField,
  wrapped: z.string().min(1).max(10_000),
});

export const walletItemSchema = z.object({
  id: z.string().uuid(),
  addedBy: z.instanceof(ObjectId),
  category: z.enum(VAULT_CATEGORIES),
  ciphertext: ciphertextField,
  sourceItemId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const walletSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  ownerId: z.instanceof(ObjectId),
  encryptedName: ciphertextField,
  keyEpoch: z.number().int().nonnegative(),
  items: z.array(walletItemSchema).max(WALLET_MAX_ITEMS),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const walletMemberSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  walletId: z.instanceof(ObjectId),
  userId: z.instanceof(ObjectId),
  role: z.enum(WALLET_ROLES),
  status: z.enum(WALLET_MEMBER_STATUSES),
  wrappedWalletKey: wrappedKeySchema,
  keyEpoch: z.number().int().nonnegative(),
  requestedAt: z.date(),
  approvedAt: z.date().nullable(),
});

export const walletInviteSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  walletId: z.instanceof(ObjectId),
  token: z.string().min(16).max(128),
  createdBy: z.instanceof(ObjectId),
  expiresAt: z.date(),
  maxUses: z.number().int().positive().max(WALLET_INVITE_MAX_USES),
  useCount: z.number().int().nonnegative(),
  revoked: z.boolean(),
  createdAt: z.date(),
});

export const createWalletBodySchema = z.object({
  encryptedName: ciphertextField,
  wrappedWalletKey: wrappedKeySchema,
});

export const renameWalletBodySchema = z.object({
  encryptedName: ciphertextField,
});

export const walletItemBodySchema = z.object({
  category: z.enum(VAULT_CATEGORIES),
  ciphertext: ciphertextField,
  sourceItemId: z.string().uuid().nullable().optional(),
});

export const createInviteBodySchema = z.object({
  expiresInDays: z.number().int().positive().max(WALLET_INVITE_MAX_TTL_DAYS).default(7),
  maxUses: z.number().int().positive().max(WALLET_INVITE_MAX_USES).default(5),
});

export const joinWalletBodySchema = z.object({
  wrappedWalletKey: wrappedKeySchema,
});

export const rotateWalletBodySchema = z.object({
  encryptedName: ciphertextField,
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        category: z.enum(VAULT_CATEGORIES),
        ciphertext: ciphertextField,
        sourceItemId: z.string().uuid().nullable().optional(),
        createdAt: z.coerce.date(),
      })
    )
    .max(WALLET_MAX_ITEMS),
  members: z
    .array(
      z.object({
        userId: z.string().min(1),
        wrappedWalletKey: wrappedKeySchema,
      })
    )
    .max(WALLET_MAX_MEMBERS),
});

export type Wallet = z.infer<typeof walletSchema>;
export type WalletItem = z.infer<typeof walletItemSchema>;
export type WalletMember = z.infer<typeof walletMemberSchema>;
export type WalletInvite = z.infer<typeof walletInviteSchema>;
export type WrappedKey = z.infer<typeof wrappedKeySchema>;
