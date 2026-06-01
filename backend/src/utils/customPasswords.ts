import { ObjectId } from 'mongodb';
import database from '../database';
import { encrypt, decrypt } from './encryption';
import logger from './logger';

/**
 * User-level custom PDF passwords.
 *
 * Stored on the `users` document under `customPdfPasswords` as a single
 * AES-256-GCM encrypted JSON string (same posture as the PAN / Gmail refresh
 * token). Tried — in addition to the derived defaults (CDSL = PAN, SafeGold =
 * name+phone) — when opening password-protected PDFs across every parse flow
 * (CDSL eCAS, SafeGold statements/invoices, EPF passbook upload).
 */

/** Max number of custom passwords a user may store. */
export const MAX_CUSTOM_PASSWORDS = 20;
/** Max length of a single custom password. */
export const MAX_CUSTOM_PASSWORD_LENGTH = 128;

/**
 * Reads and decrypts a user's custom PDF passwords.
 * Returns [] when none are set or decryption fails (never throws).
 */
export async function loadCustomPdfPasswords(userId: string | ObjectId): Promise<string[]> {
  try {
    const db = database.getDb();
    const _id = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const userDoc = await db
      .collection('users')
      .findOne({ _id }, { projection: { customPdfPasswords: 1 } });
    return decryptCustomPdfPasswords(userDoc?.customPdfPasswords as string | undefined);
  } catch (err) {
    logger.warn({ err }, '[CustomPasswords] Failed to load custom passwords');
    return [];
  }
}

/**
 * Decrypts the stored blob into a string array.
 * Accepts the raw `customPdfPasswords` field value (encrypted string | undefined).
 */
export function decryptCustomPdfPasswords(stored: string | undefined | null): string[] {
  if (!stored) return [];
  try {
    const parsed = JSON.parse(decrypt(stored));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === 'string' && p.length > 0);
  } catch (err) {
    logger.warn({ err }, '[CustomPasswords] Failed to decrypt custom passwords');
    return [];
  }
}

/** Encrypts a cleaned password array into the storable blob. */
export function encryptCustomPdfPasswords(passwords: string[]): string {
  return encrypt(JSON.stringify(passwords));
}

/**
 * Cleans a user-supplied password list: trims, drops empties/dupes, and clamps
 * to the configured limits. Throws if any entry is too long.
 */
export function sanitizeCustomPdfPasswords(input: unknown): string[] {
  if (!Array.isArray(input)) {
    throw new Error('passwords must be an array of strings');
  }
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const pwd = raw.trim();
    if (!pwd) continue;
    if (pwd.length > MAX_CUSTOM_PASSWORD_LENGTH) {
      throw new Error(`Each password must be at most ${MAX_CUSTOM_PASSWORD_LENGTH} characters`);
    }
    if (seen.has(pwd)) continue;
    seen.add(pwd);
    cleaned.push(pwd);
  }
  if (cleaned.length > MAX_CUSTOM_PASSWORDS) {
    throw new Error(`At most ${MAX_CUSTOM_PASSWORDS} custom passwords are allowed`);
  }
  return cleaned;
}
