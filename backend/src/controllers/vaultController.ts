import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { ZodError } from 'zod';
import database from '../database';
import { encrypt, decrypt } from '../utils/encryption';
import { getUserFromRequest } from '../utils/jwtHelpers';
import { computeLockoutMs, VAULT_MAX_FREE_ATTEMPTS } from '../utils/vaultLockout';
import {
  VAULT_KDF_ALGO,
  VAULT_MAX_ITEMS,
  vaultInitBodySchema,
  vaultItemBodySchema,
  vaultKeyPairBodySchema,
  vaultRekeyBodySchema,
} from '../schemas/vault';
import logger from '../utils/logger';

const VAULTS_COLLECTION = 'vaults';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StoredVaultItem {
  id: string;
  category: string;
  ciphertext: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VaultDocument {
  userId: ObjectId;
  salt: string;
  verifier: string;
  kdf: { algo: string; iterations: number };
  keyEpoch: number;
  publicKey: Record<string, unknown> | null;
  wrappedPrivateKey: string | null;
  items: StoredVaultItem[];
  failedAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function vaultsCollection() {
  return database.getDb().collection<VaultDocument>(VAULTS_COLLECTION);
}

function respondUnauthenticated(res: Response) {
  res.status(401).json({ success: false, message: 'Authentication required' });
}

function respondInvalidPayload(res: Response) {
  res.status(400).json({ success: false, message: 'Invalid request payload' });
}

function unwrapStoredCiphertext(value: string): string | null {
  try {
    return decrypt(value);
  } catch {
    return null;
  }
}

export async function getVaultMeta(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const collection = vaultsCollection();
    const vault = await collection.findOne(
      { userId: new ObjectId(user.userId) },
      { projection: { items: 0, verifier: 0 } }
    );
    if (!vault) {
      res.status(200).json({ success: true, data: { exists: false } });
      return;
    }
    res.status(200).json({
      success: true,
      data: {
        exists: true,
        salt: vault.salt,
        kdf: vault.kdf,
        keyEpoch: vault.keyEpoch,
        lockedUntil: vault.lockedUntil,
        attemptsRemaining: Math.max(0, VAULT_MAX_FREE_ATTEMPTS - (vault.failedAttempts ?? 0)),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Fetch vault meta error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function initVault(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const parsed = vaultInitBodySchema.parse(req.body);
    const collection = vaultsCollection();
    const userId = new ObjectId(user.userId);

    const existing = await collection.findOne({ userId }, { projection: { _id: 1 } });
    if (existing) {
      res.status(409).json({ success: false, message: 'Vault already exists' });
      return;
    }

    const now = new Date();
    const result = await collection.insertOne({
      userId,
      salt: parsed.salt,
      verifier: encrypt(parsed.verifier),
      kdf: { algo: VAULT_KDF_ALGO, iterations: parsed.iterations },
      keyEpoch: 0,
      publicKey: parsed.publicKey ?? null,
      wrappedPrivateKey: parsed.wrappedPrivateKey ?? null,
      items: [],
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json({ success: true, message: 'Vault created', id: result.insertedId });
  } catch (error) {
    if (error instanceof ZodError) {
      respondInvalidPayload(res);
      return;
    }
    logger.error({ err: error }, 'Init vault error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function unlockVault(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const collection = vaultsCollection();
    const userId = new ObjectId(user.userId);
    const vault = await collection.findOne({ userId });
    if (!vault) {
      res.status(404).json({ success: false, message: 'Vault not found' });
      return;
    }

    const now = new Date();
    if (vault.lockedUntil && new Date(vault.lockedUntil) > now) {
      const lockedUntil = new Date(vault.lockedUntil);
      res.status(429).json({
        success: false,
        message: 'Too many failed attempts',
        data: { lockedUntil, retryAfterMs: lockedUntil.getTime() - now.getTime() },
      });
      return;
    }

    const attemptsAfterThisOne = (vault.failedAttempts ?? 0) + 1;
    const lockoutMs = computeLockoutMs(attemptsAfterThisOne);
    await collection.updateOne(
      { userId },
      {
        $set: {
          failedAttempts: attemptsAfterThisOne,
          lockedUntil: lockoutMs > 0 ? new Date(now.getTime() + lockoutMs) : null,
        },
      }
    );

    res.status(200).json({
      success: true,
      data: {
        salt: vault.salt,
        verifier: decrypt(vault.verifier),
        kdf: vault.kdf,
        keyEpoch: vault.keyEpoch,
        publicKey: vault.publicKey ?? null,
        wrappedPrivateKey: vault.wrappedPrivateKey ?? null,
        attemptsRemaining: Math.max(0, VAULT_MAX_FREE_ATTEMPTS - attemptsAfterThisOne),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Unlock vault error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function confirmVaultUnlock(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const collection = vaultsCollection();
    const result = await collection.updateOne(
      { userId: new ObjectId(user.userId) },
      { $set: { failedAttempts: 0, lockedUntil: null } }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Vault not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Unlock confirmed' });
  } catch (error) {
    logger.error({ err: error }, 'Confirm vault unlock error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getVaultItems(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const collection = vaultsCollection();
    const vault = await collection.findOne({ userId: new ObjectId(user.userId) });
    if (!vault) {
      res.status(404).json({ success: false, message: 'Vault not found' });
      return;
    }
    const items = (vault.items ?? []).map((item) => ({
      id: item.id,
      category: item.category,
      ciphertext: unwrapStoredCiphertext(item.ciphertext),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    logger.error({ err: error }, 'Fetch vault items error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function upsertVaultItem(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { itemId } = req.params;
    if (!UUID_PATTERN.test(itemId)) {
      res.status(400).json({ success: false, message: 'Invalid item ID' });
      return;
    }
    const parsed = vaultItemBodySchema.parse(req.body);
    const collection = vaultsCollection();
    const userId = new ObjectId(user.userId);
    const now = new Date();
    const wrapped = encrypt(parsed.ciphertext);

    const updated = await collection.updateOne(
      { userId },
      {
        $set: {
          'items.$[entry].ciphertext': wrapped,
          'items.$[entry].category': parsed.category,
          'items.$[entry].updatedAt': now,
          updatedAt: now,
        },
      },
      { arrayFilters: [{ 'entry.id': itemId }] }
    );

    if (updated.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Vault not found' });
      return;
    }

    if (updated.modifiedCount === 0) {
      const inserted = await collection.updateOne(
        { userId, [`items.${VAULT_MAX_ITEMS}`]: { $exists: false } },
        {
          $push: {
            items: {
              id: itemId,
              category: parsed.category,
              ciphertext: wrapped,
              createdAt: now,
              updatedAt: now,
            },
          },
          $set: { updatedAt: now },
        }
      );
      if (inserted.matchedCount === 0) {
        res.status(400).json({ success: false, message: 'Vault item limit reached' });
        return;
      }
    }

    res.status(200).json({ success: true, message: 'Vault item saved' });
  } catch (error) {
    if (error instanceof ZodError) {
      respondInvalidPayload(res);
      return;
    }
    logger.error({ err: error }, 'Save vault item error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteVaultItem(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { itemId } = req.params;
    if (!UUID_PATTERN.test(itemId)) {
      res.status(400).json({ success: false, message: 'Invalid item ID' });
      return;
    }
    const collection = vaultsCollection();
    const result = await collection.updateOne(
      { userId: new ObjectId(user.userId) },
      { $pull: { items: { id: itemId } }, $set: { updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Vault not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Vault item deleted' });
  } catch (error) {
    logger.error({ err: error }, 'Delete vault item error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function rekeyVault(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const parsed = vaultRekeyBodySchema.parse(req.body);
    const collection = vaultsCollection();
    const userId = new ObjectId(user.userId);
    const vault = await collection.findOne({ userId }, { projection: { keyEpoch: 1 } });
    if (!vault) {
      res.status(404).json({ success: false, message: 'Vault not found' });
      return;
    }

    const now = new Date();
    const rewrappedItems = parsed.items.map((item) => ({
      id: item.id,
      category: item.category,
      ciphertext: encrypt(item.ciphertext),
      createdAt: item.createdAt,
      updatedAt: now,
    }));

    await collection.updateOne(
      { userId },
      {
        $set: {
          salt: parsed.salt,
          verifier: encrypt(parsed.verifier),
          kdf: { algo: VAULT_KDF_ALGO, iterations: parsed.iterations },
          wrappedPrivateKey: parsed.wrappedPrivateKey ?? null,
          items: rewrappedItems,
          keyEpoch: (vault.keyEpoch ?? 0) + 1,
          failedAttempts: 0,
          lockedUntil: null,
          updatedAt: now,
        },
      }
    );
    res.status(200).json({ success: true, message: 'Vault PIN changed' });
  } catch (error) {
    if (error instanceof ZodError) {
      respondInvalidPayload(res);
      return;
    }
    logger.error({ err: error }, 'Rekey vault error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function destroyVault(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const collection = vaultsCollection();
    await collection.deleteOne({ userId: new ObjectId(user.userId) });
    res.status(200).json({ success: true, message: 'Vault destroyed' });
  } catch (error) {
    logger.error({ err: error }, 'Destroy vault error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function saveVaultKeyPair(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const parsed = vaultKeyPairBodySchema.parse(req.body);
    const collection = vaultsCollection();
    const result = await collection.updateOne(
      { userId: new ObjectId(user.userId), publicKey: null },
      {
        $set: {
          publicKey: parsed.publicKey,
          wrappedPrivateKey: parsed.wrappedPrivateKey,
          updatedAt: new Date(),
        },
      }
    );
    if (result.matchedCount === 0) {
      res.status(409).json({ success: false, message: 'Sharing keys already set up' });
      return;
    }
    res.status(200).json({ success: true, message: 'Sharing keys saved' });
  } catch (error) {
    if (error instanceof ZodError) {
      respondInvalidPayload(res);
      return;
    }
    logger.error({ err: error }, 'Save vault key pair error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getVaultPublicKey(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      respondUnauthenticated(res);
      return;
    }
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }
    const collection = vaultsCollection();
    const vault = await collection.findOne(
      { userId: new ObjectId(userId) },
      { projection: { publicKey: 1 } }
    );
    if (!vault?.publicKey) {
      res.status(404).json({ success: false, message: 'This user has not set up sharing keys' });
      return;
    }
    res.status(200).json({ success: true, data: { userId, publicKey: vault.publicKey } });
  } catch (error) {
    logger.error({ err: error }, 'Fetch vault public key error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
