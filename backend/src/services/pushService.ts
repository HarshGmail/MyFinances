import webpush from 'web-push';
import database from '../database';
import config from '../config';
import logger from '../utils/logger';

const COLLECTION = 'pushSubscriptions';
const GONE_STATUS_CODES = [404, 410];

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let isConfigured = false;

export function isPushConfigured(): boolean {
  return Boolean(config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY);
}

function configureWebPush(): boolean {
  if (isConfigured) return true;
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    config.VAPID_SUBJECT!,
    config.VAPID_PUBLIC_KEY!,
    config.VAPID_PRIVATE_KEY!
  );
  isConfigured = true;
  return true;
}

export async function saveSubscription(
  userId: string,
  subscription: PushSubscriptionRecord
): Promise<void> {
  await database
    .getDb()
    .collection(COLLECTION)
    .updateOne(
      { userId, endpoint: subscription.endpoint },
      { $set: { userId, ...subscription, updatedAt: new Date() } },
      { upsert: true }
    );
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await database.getDb().collection(COLLECTION).deleteOne({ userId, endpoint });
}

export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  if (!configureWebPush()) return 0;

  const db = database.getDb();
  const subscriptions = await db.collection(COLLECTION).find({ userId }).toArray();
  if (!subscriptions.length) return 0;

  const serialised = JSON.stringify(payload);
  let delivered = 0;

  await Promise.all(
    subscriptions.map(async (record) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: record.endpoint,
            keys: { p256dh: record.keys.p256dh, auth: record.keys.auth },
          },
          serialised
        );
        delivered += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode && GONE_STATUS_CODES.includes(statusCode)) {
          await db.collection(COLLECTION).deleteOne({ _id: record._id });
          return;
        }
        logger.warn({ err, endpoint: record.endpoint }, 'Web push delivery failed');
      }
    })
  );

  return delivered;
}
