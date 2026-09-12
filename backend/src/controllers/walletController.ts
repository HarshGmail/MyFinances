import crypto from 'crypto';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { ZodError } from 'zod';
import database from '../database';
import { encrypt, decrypt } from '../utils/encryption';
import { getUserFromRequest } from '../utils/jwtHelpers';
import {
  WALLET_MAX_ITEMS,
  WALLET_MAX_MEMBERS,
  createInviteBodySchema,
  createWalletBodySchema,
  joinWalletBodySchema,
  renameWalletBodySchema,
  rotateWalletBodySchema,
  walletItemBodySchema,
} from '../schemas/wallet';
import logger from '../utils/logger';

const WALLETS_COLLECTION = 'wallets';
const WALLET_MEMBERS_COLLECTION = 'walletMembers';
const WALLET_INVITES_COLLECTION = 'walletInvites';
const USERS_COLLECTION = 'users';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVITE_TOKEN_BYTES = 24;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface WrappedKeyDocument {
  epk: Record<string, unknown>;
  wrapped: string;
}

interface WalletItemDocument {
  id: string;
  addedBy: ObjectId;
  category: string;
  ciphertext: string;
  sourceItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface WalletDocument {
  ownerId: ObjectId;
  encryptedName: string;
  keyEpoch: number;
  items: WalletItemDocument[];
  createdAt: Date;
  updatedAt: Date;
}

interface WalletMemberDocument {
  walletId: ObjectId;
  userId: ObjectId;
  role: 'owner' | 'member';
  status: 'pending' | 'active';
  wrappedWalletKey: WrappedKeyDocument;
  keyEpoch: number;
  requestedAt: Date;
  approvedAt: Date | null;
}

interface WalletInviteDocument {
  walletId: ObjectId;
  token: string;
  createdBy: ObjectId;
  expiresAt: Date;
  maxUses: number;
  useCount: number;
  revoked: boolean;
  createdAt: Date;
}

function walletsCollection() {
  return database.getDb().collection<WalletDocument>(WALLETS_COLLECTION);
}

function walletMembersCollection() {
  return database.getDb().collection<WalletMemberDocument>(WALLET_MEMBERS_COLLECTION);
}

function walletInvitesCollection() {
  return database.getDb().collection<WalletInviteDocument>(WALLET_INVITES_COLLECTION);
}

function respondUnauthenticated(res: Response) {
  res.status(401).json({ success: false, message: 'Authentication required' });
}

function respondInvalidPayload(res: Response) {
  res.status(400).json({ success: false, message: 'Invalid request payload' });
}

function respondForbidden(res: Response) {
  res.status(403).json({ success: false, message: 'You do not have access to this wallet' });
}

function unwrapStoredCiphertext(value: string): string | null {
  try {
    return decrypt(value);
  } catch {
    return null;
  }
}

function wrapKeyForStorage(wrappedKey: WrappedKeyDocument): WrappedKeyDocument {
  return { epk: wrappedKey.epk, wrapped: encrypt(wrappedKey.wrapped) };
}

function unwrapKeyFromStorage(wrappedKey: WrappedKeyDocument): WrappedKeyDocument | null {
  const wrapped = unwrapStoredCiphertext(wrappedKey.wrapped);
  if (!wrapped) return null;
  return { epk: wrappedKey.epk, wrapped };
}

async function resolveActiveMembership(walletId: ObjectId, userId: ObjectId) {
  return walletMembersCollection().findOne({ walletId, userId, status: 'active' });
}

async function lookupUserNames(userIds: ObjectId[]) {
  if (userIds.length === 0) return new Map<string, { name: string; email: string }>();
  const users = await database
    .getDb()
    .collection(USERS_COLLECTION)
    .find({ _id: { $in: userIds } }, { projection: { name: 1, email: 1 } })
    .toArray();
  return new Map(
    users.map((user) => [
      user._id.toString(),
      { name: (user.name as string) ?? '', email: (user.email as string) ?? '' },
    ])
  );
}

export async function getWallets(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const userId = new ObjectId(user.userId);
    const memberships = await walletMembersCollection()
      .find({ userId, status: 'active' })
      .toArray();
    if (memberships.length === 0) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const walletIds = memberships.map((membership) => membership.walletId);
    const wallets = await walletsCollection()
      .find({ _id: { $in: walletIds } })
      .toArray();
    const walletsById = new Map(wallets.map((wallet) => [wallet._id.toString(), wallet]));

    const allMembers = await walletMembersCollection()
      .find({ walletId: { $in: walletIds } })
      .toArray();
    const ownerNames = await lookupUserNames(wallets.map((wallet) => wallet.ownerId));

    const data = memberships
      .map((membership) => {
        const wallet = walletsById.get(membership.walletId.toString());
        if (!wallet) return null;
        const walletMembers = allMembers.filter(
          (entry) => entry.walletId.toString() === wallet._id.toString()
        );
        const isOwner = wallet.ownerId.toString() === user.userId;
        return {
          id: wallet._id.toString(),
          encryptedName: unwrapStoredCiphertext(wallet.encryptedName),
          wrappedWalletKey: unwrapKeyFromStorage(membership.wrappedWalletKey),
          keyEpoch: wallet.keyEpoch,
          memberKeyEpoch: membership.keyEpoch,
          role: membership.role,
          isOwner,
          ownerName: ownerNames.get(wallet.ownerId.toString())?.name ?? '',
          itemCount: wallet.items.length,
          memberCount: walletMembers.filter((entry) => entry.status === 'active').length,
          pendingCount: isOwner
            ? walletMembers.filter((entry) => entry.status === 'pending').length
            : 0,
          updatedAt: wallet.updatedAt,
        };
      })
      .filter(Boolean);

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Fetch wallets error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function createWallet(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const parsed = createWalletBodySchema.parse(req.body);
    const userId = new ObjectId(user.userId);
    const now = new Date();

    const wallet = await walletsCollection().insertOne({
      ownerId: userId,
      encryptedName: encrypt(parsed.encryptedName),
      keyEpoch: 0,
      items: [],
      createdAt: now,
      updatedAt: now,
    });

    await walletMembersCollection().insertOne({
      walletId: wallet.insertedId,
      userId,
      role: 'owner',
      status: 'active',
      wrappedWalletKey: wrapKeyForStorage(parsed.wrappedWalletKey),
      keyEpoch: 0,
      requestedAt: now,
      approvedAt: now,
    });

    res
      .status(201)
      .json({ success: true, message: 'Wallet created', id: wallet.insertedId.toString() });
  } catch (error) {
    if (error instanceof ZodError) {
      respondInvalidPayload(res);
      return;
    }
    logger.error({ err: error }, 'Create wallet error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function renameWallet(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId } = req.params;
    if (!ObjectId.isValid(walletId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet ID' });
      return;
    }
    const parsed = renameWalletBodySchema.parse(req.body);
    const result = await walletsCollection().updateOne(
      { _id: new ObjectId(walletId), ownerId: new ObjectId(user.userId) },
      { $set: { encryptedName: encrypt(parsed.encryptedName), updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      respondForbidden(res);
      return;
    }
    res.status(200).json({ success: true, message: 'Wallet renamed' });
  } catch (error) {
    if (error instanceof ZodError) {
      respondInvalidPayload(res);
      return;
    }
    logger.error({ err: error }, 'Rename wallet error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteWallet(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId } = req.params;
    if (!ObjectId.isValid(walletId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet ID' });
      return;
    }
    const walletObjectId = new ObjectId(walletId);
    const result = await walletsCollection().deleteOne({
      _id: walletObjectId,
      ownerId: new ObjectId(user.userId),
    });
    if (result.deletedCount === 0) {
      respondForbidden(res);
      return;
    }
    await walletMembersCollection().deleteMany({ walletId: walletObjectId });
    await walletInvitesCollection().deleteMany({ walletId: walletObjectId });
    res.status(200).json({ success: true, message: 'Wallet deleted' });
  } catch (error) {
    logger.error({ err: error }, 'Delete wallet error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getWalletItems(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId } = req.params;
    if (!ObjectId.isValid(walletId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet ID' });
      return;
    }
    const walletObjectId = new ObjectId(walletId);
    const membership = await resolveActiveMembership(walletObjectId, new ObjectId(user.userId));
    if (!membership) {
      respondForbidden(res);
      return;
    }
    const wallet = await walletsCollection().findOne({ _id: walletObjectId });
    if (!wallet) {
      res.status(404).json({ success: false, message: 'Wallet not found' });
      return;
    }

    const contributorNames = await lookupUserNames(wallet.items.map((item) => item.addedBy));

    res.status(200).json({
      success: true,
      data: {
        id: wallet._id.toString(),
        encryptedName: unwrapStoredCiphertext(wallet.encryptedName),
        wrappedWalletKey: unwrapKeyFromStorage(membership.wrappedWalletKey),
        keyEpoch: wallet.keyEpoch,
        role: membership.role,
        isOwner: wallet.ownerId.toString() === user.userId,
        items: wallet.items.map((item) => ({
          id: item.id,
          category: item.category,
          ciphertext: unwrapStoredCiphertext(item.ciphertext),
          sourceItemId: item.sourceItemId,
          addedBy: item.addedBy.toString(),
          addedByName: contributorNames.get(item.addedBy.toString())?.name ?? '',
          isMine: item.addedBy.toString() === user.userId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Fetch wallet items error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function addWalletItem(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId, itemId } = req.params;
    if (!ObjectId.isValid(walletId) || !UUID_PATTERN.test(itemId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet or item ID' });
      return;
    }
    const parsed = walletItemBodySchema.parse(req.body);
    const walletObjectId = new ObjectId(walletId);
    const userId = new ObjectId(user.userId);
    const membership = await resolveActiveMembership(walletObjectId, userId);
    if (!membership) {
      respondForbidden(res);
      return;
    }

    const now = new Date();
    const wrapped = encrypt(parsed.ciphertext);

    const updated = await walletsCollection().updateOne(
      { _id: walletObjectId },
      {
        $set: {
          'items.$[entry].ciphertext': wrapped,
          'items.$[entry].category': parsed.category,
          'items.$[entry].updatedAt': now,
          updatedAt: now,
        },
      },
      { arrayFilters: [{ 'entry.id': itemId, 'entry.addedBy': userId }] }
    );

    if (updated.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Wallet not found' });
      return;
    }

    if (updated.modifiedCount === 0) {
      const alreadyExists = await walletsCollection().findOne(
        { _id: walletObjectId, 'items.id': itemId },
        { projection: { _id: 1 } }
      );
      if (alreadyExists) {
        res
          .status(403)
          .json({ success: false, message: 'You can only edit entries you shared yourself' });
        return;
      }
      const inserted = await walletsCollection().updateOne(
        { _id: walletObjectId, [`items.${WALLET_MAX_ITEMS}`]: { $exists: false } },
        {
          $push: {
            items: {
              id: itemId,
              addedBy: userId,
              category: parsed.category,
              ciphertext: wrapped,
              sourceItemId: parsed.sourceItemId ?? null,
              createdAt: now,
              updatedAt: now,
            },
          },
          $set: { updatedAt: now },
        }
      );
      if (inserted.matchedCount === 0) {
        res.status(400).json({ success: false, message: 'Wallet item limit reached' });
        return;
      }
    }

    res.status(200).json({ success: true, message: 'Wallet entry saved' });
  } catch (error) {
    if (error instanceof ZodError) {
      respondInvalidPayload(res);
      return;
    }
    logger.error({ err: error }, 'Save wallet item error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteWalletItem(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId, itemId } = req.params;
    if (!ObjectId.isValid(walletId) || !UUID_PATTERN.test(itemId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet or item ID' });
      return;
    }
    const walletObjectId = new ObjectId(walletId);
    const userId = new ObjectId(user.userId);
    const membership = await resolveActiveMembership(walletObjectId, userId);
    if (!membership) {
      respondForbidden(res);
      return;
    }
    const wallet = await walletsCollection().findOne({ _id: walletObjectId });
    if (!wallet) {
      res.status(404).json({ success: false, message: 'Wallet not found' });
      return;
    }
    const item = wallet.items.find((entry) => entry.id === itemId);
    if (!item) {
      res.status(404).json({ success: false, message: 'Wallet entry not found' });
      return;
    }
    const isOwner = wallet.ownerId.toString() === user.userId;
    if (!isOwner && item.addedBy.toString() !== user.userId) {
      res
        .status(403)
        .json({ success: false, message: 'You can only remove entries you shared yourself' });
      return;
    }

    await walletsCollection().updateOne(
      { _id: walletObjectId },
      { $pull: { items: { id: itemId } }, $set: { updatedAt: new Date() } }
    );
    res.status(200).json({ success: true, message: 'Wallet entry removed' });
  } catch (error) {
    logger.error({ err: error }, 'Delete wallet item error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getWalletMembers(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId } = req.params;
    if (!ObjectId.isValid(walletId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet ID' });
      return;
    }
    const walletObjectId = new ObjectId(walletId);
    const membership = await resolveActiveMembership(walletObjectId, new ObjectId(user.userId));
    if (!membership) {
      respondForbidden(res);
      return;
    }
    const wallet = await walletsCollection().findOne(
      { _id: walletObjectId },
      { projection: { ownerId: 1 } }
    );
    if (!wallet) {
      res.status(404).json({ success: false, message: 'Wallet not found' });
      return;
    }
    const isOwner = wallet.ownerId.toString() === user.userId;
    const members = await walletMembersCollection().find({ walletId: walletObjectId }).toArray();
    const visible = isOwner ? members : members.filter((entry) => entry.status === 'active');
    const names = await lookupUserNames(visible.map((entry) => entry.userId));

    res.status(200).json({
      success: true,
      data: visible.map((entry) => ({
        userId: entry.userId.toString(),
        name: names.get(entry.userId.toString())?.name ?? '',
        email: names.get(entry.userId.toString())?.email ?? '',
        role: entry.role,
        status: entry.status,
        isMe: entry.userId.toString() === user.userId,
        requestedAt: entry.requestedAt,
        approvedAt: entry.approvedAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, 'Fetch wallet members error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function approveWalletMember(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId, userId: targetUserId } = req.params;
    if (!ObjectId.isValid(walletId) || !ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet or user ID' });
      return;
    }
    const walletObjectId = new ObjectId(walletId);
    const wallet = await walletsCollection().findOne(
      { _id: walletObjectId, ownerId: new ObjectId(user.userId) },
      { projection: { keyEpoch: 1 } }
    );
    if (!wallet) {
      respondForbidden(res);
      return;
    }

    const activeCount = await walletMembersCollection().countDocuments({
      walletId: walletObjectId,
      status: 'active',
    });
    if (activeCount >= WALLET_MAX_MEMBERS) {
      res.status(400).json({ success: false, message: 'Wallet member limit reached' });
      return;
    }

    const result = await walletMembersCollection().updateOne(
      { walletId: walletObjectId, userId: new ObjectId(targetUserId), status: 'pending' },
      { $set: { status: 'active', approvedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'No pending request from this user' });
      return;
    }
    res.status(200).json({ success: true, message: 'Member approved' });
  } catch (error) {
    logger.error({ err: error }, 'Approve wallet member error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function removeWalletMember(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId, userId: targetUserId } = req.params;
    if (!ObjectId.isValid(walletId) || !ObjectId.isValid(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet or user ID' });
      return;
    }
    if (targetUserId === user.userId) {
      res.status(400).json({ success: false, message: 'The owner cannot leave their own wallet' });
      return;
    }
    const walletObjectId = new ObjectId(walletId);
    const wallet = await walletsCollection().findOne(
      { _id: walletObjectId, ownerId: new ObjectId(user.userId) },
      { projection: { _id: 1 } }
    );
    if (!wallet) {
      respondForbidden(res);
      return;
    }
    const result = await walletMembersCollection().deleteOne({
      walletId: walletObjectId,
      userId: new ObjectId(targetUserId),
    });
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Member not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Member removed' });
  } catch (error) {
    logger.error({ err: error }, 'Remove wallet member error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function rotateWalletKey(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId } = req.params;
    if (!ObjectId.isValid(walletId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet ID' });
      return;
    }
    const parsed = rotateWalletBodySchema.parse(req.body);
    const walletObjectId = new ObjectId(walletId);
    const wallet = await walletsCollection().findOne({
      _id: walletObjectId,
      ownerId: new ObjectId(user.userId),
    });
    if (!wallet) {
      respondForbidden(res);
      return;
    }

    const activeMembers = await walletMembersCollection()
      .find({ walletId: walletObjectId, status: 'active' })
      .toArray();
    const suppliedUserIds = new Set(parsed.members.map((member) => member.userId));
    const missing = activeMembers.filter(
      (member) => !suppliedUserIds.has(member.userId.toString())
    );
    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        message: 'The rotated key must be re-wrapped for every remaining member',
      });
      return;
    }

    const now = new Date();
    const nextEpoch = wallet.keyEpoch + 1;
    const existingItemsById = new Map(wallet.items.map((item) => [item.id, item]));

    const rewrappedItems = parsed.items
      .filter((item) => existingItemsById.has(item.id))
      .map((item) => {
        const existing = existingItemsById.get(item.id) as WalletItemDocument;
        return {
          id: item.id,
          addedBy: existing.addedBy,
          category: item.category,
          ciphertext: encrypt(item.ciphertext),
          sourceItemId: item.sourceItemId ?? existing.sourceItemId ?? null,
          createdAt: item.createdAt,
          updatedAt: now,
        };
      });

    await walletsCollection().updateOne(
      { _id: walletObjectId },
      {
        $set: {
          encryptedName: encrypt(parsed.encryptedName),
          items: rewrappedItems,
          keyEpoch: nextEpoch,
          updatedAt: now,
        },
      }
    );

    await Promise.all(
      parsed.members.map((member) =>
        walletMembersCollection().updateOne(
          { walletId: walletObjectId, userId: new ObjectId(member.userId), status: 'active' },
          {
            $set: {
              wrappedWalletKey: wrapKeyForStorage(member.wrappedWalletKey),
              keyEpoch: nextEpoch,
            },
          }
        )
      )
    );

    await walletMembersCollection().deleteMany({
      walletId: walletObjectId,
      status: 'pending',
    });
    await walletInvitesCollection().updateMany(
      { walletId: walletObjectId, revoked: false },
      { $set: { revoked: true } }
    );

    res.status(200).json({ success: true, message: 'Wallet key rotated' });
  } catch (error) {
    if (error instanceof ZodError) {
      respondInvalidPayload(res);
      return;
    }
    logger.error({ err: error }, 'Rotate wallet key error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function createWalletInvite(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId } = req.params;
    if (!ObjectId.isValid(walletId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet ID' });
      return;
    }
    const parsed = createInviteBodySchema.parse(req.body ?? {});
    const walletObjectId = new ObjectId(walletId);
    const wallet = await walletsCollection().findOne(
      { _id: walletObjectId, ownerId: new ObjectId(user.userId) },
      { projection: { _id: 1 } }
    );
    if (!wallet) {
      respondForbidden(res);
      return;
    }

    const now = new Date();
    const token = crypto.randomBytes(INVITE_TOKEN_BYTES).toString('base64url');
    const invite = await walletInvitesCollection().insertOne({
      walletId: walletObjectId,
      token,
      createdBy: new ObjectId(user.userId),
      expiresAt: new Date(now.getTime() + parsed.expiresInDays * DAY_IN_MS),
      maxUses: parsed.maxUses,
      useCount: 0,
      revoked: false,
      createdAt: now,
    });

    res.status(201).json({
      success: true,
      data: {
        id: invite.insertedId.toString(),
        token,
        expiresAt: new Date(now.getTime() + parsed.expiresInDays * DAY_IN_MS),
        maxUses: parsed.maxUses,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      respondInvalidPayload(res);
      return;
    }
    logger.error({ err: error }, 'Create wallet invite error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function revokeWalletInvite(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { walletId, inviteId } = req.params;
    if (!ObjectId.isValid(walletId) || !ObjectId.isValid(inviteId)) {
      res.status(400).json({ success: false, message: 'Invalid wallet or invite ID' });
      return;
    }
    const walletObjectId = new ObjectId(walletId);
    const wallet = await walletsCollection().findOne(
      { _id: walletObjectId, ownerId: new ObjectId(user.userId) },
      { projection: { _id: 1 } }
    );
    if (!wallet) {
      respondForbidden(res);
      return;
    }
    await walletInvitesCollection().updateOne(
      { _id: new ObjectId(inviteId), walletId: walletObjectId },
      { $set: { revoked: true } }
    );
    res.status(200).json({ success: true, message: 'Invite revoked' });
  } catch (error) {
    logger.error({ err: error }, 'Revoke wallet invite error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function resolveUsableInvite(token: string) {
  const invite = await walletInvitesCollection().findOne({ token });
  if (!invite) return { invite: null, reason: 'This invite link is not valid' };
  if (invite.revoked) return { invite: null, reason: 'This invite link has been revoked' };
  if (invite.expiresAt < new Date())
    return { invite: null, reason: 'This invite link has expired' };
  if (invite.useCount >= invite.maxUses)
    return { invite: null, reason: 'This invite link has reached its limit' };
  return { invite, reason: '' };
}

export async function getWalletInviteInfo(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { invite, reason } = await resolveUsableInvite(req.params.token);
    if (!invite) {
      res.status(404).json({ success: false, message: reason });
      return;
    }
    const wallet = await walletsCollection().findOne(
      { _id: invite.walletId },
      { projection: { ownerId: 1, items: 1 } }
    );
    if (!wallet) {
      res.status(404).json({ success: false, message: 'This wallet no longer exists' });
      return;
    }
    const ownerNames = await lookupUserNames([wallet.ownerId]);
    const membership = await walletMembersCollection().findOne({
      walletId: invite.walletId,
      userId: new ObjectId(user.userId),
    });

    res.status(200).json({
      success: true,
      data: {
        walletId: invite.walletId.toString(),
        ownerName: ownerNames.get(wallet.ownerId.toString())?.name ?? '',
        itemCount: wallet.items.length,
        isOwner: wallet.ownerId.toString() === user.userId,
        membershipStatus: membership?.status ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Fetch wallet invite info error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function joinWallet(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const parsed = joinWalletBodySchema.parse(req.body);
    const { invite, reason } = await resolveUsableInvite(req.params.token);
    if (!invite) {
      res.status(404).json({ success: false, message: reason });
      return;
    }
    const userId = new ObjectId(user.userId);
    const wallet = await walletsCollection().findOne(
      { _id: invite.walletId },
      { projection: { keyEpoch: 1, ownerId: 1 } }
    );
    if (!wallet) {
      res.status(404).json({ success: false, message: 'This wallet no longer exists' });
      return;
    }

    const existing = await walletMembersCollection().findOne({
      walletId: invite.walletId,
      userId,
    });
    if (existing) {
      res.status(200).json({
        success: true,
        message:
          existing.status === 'active' ? 'You are already a member' : 'Your request is pending',
        data: { status: existing.status, walletId: invite.walletId.toString() },
      });
      return;
    }

    const now = new Date();
    await walletMembersCollection().insertOne({
      walletId: invite.walletId,
      userId,
      role: 'member',
      status: 'pending',
      wrappedWalletKey: wrapKeyForStorage(parsed.wrappedWalletKey),
      keyEpoch: wallet.keyEpoch,
      requestedAt: now,
      approvedAt: null,
    });
    await walletInvitesCollection().updateOne({ _id: invite._id }, { $inc: { useCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Request sent to the wallet owner',
      data: { status: 'pending', walletId: invite.walletId.toString() },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      respondInvalidPayload(res);
      return;
    }
    logger.error({ err: error }, 'Join wallet error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
