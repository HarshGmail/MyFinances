import database from '../database';

const COLLECTION = 'priceCache';

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const db = database.getDb();
    const doc = await db.collection(COLLECTION).findOne({ key });
    return doc ? (doc.data as T) : null;
  } catch {
    return null;
  }
}

/** Returns cached data only if it was stored today (midnight UTC cutoff). */
export async function getCachedToday<T>(key: string): Promise<T | null> {
  try {
    const db = database.getDb();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const doc = await db.collection(COLLECTION).findOne({ key, cachedAt: { $gte: today } });
    return doc ? (doc.data as T) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, data: unknown): Promise<void> {
  try {
    const db = database.getDb();
    await db
      .collection(COLLECTION)
      .updateOne({ key }, { $set: { key, data, cachedAt: new Date() } }, { upsert: true });
  } catch (err) {
    console.error('Cache write error:', err);
  }
}
