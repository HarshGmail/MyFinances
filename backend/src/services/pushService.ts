import axios from 'axios';
import webpush from 'web-push';
import database from '../database';
import config from '../config';
import logger from '../utils/logger';

const COLLECTION = 'pushSubscriptions';
const EXPO_TOKENS_COLLECTION = 'expoPushTokens';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_TIMEOUT_MS = 10_000;
const EXPO_DEVICE_NOT_REGISTERED = 'DeviceNotRegistered';
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

export type ExpoPushPlatform = 'ios' | 'android';

interface ExpoPushTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

export async function saveExpoPushToken(
  userId: string,
  token: string,
  platform: ExpoPushPlatform
): Promise<void> {
  await database
    .getDb()
    .collection(EXPO_TOKENS_COLLECTION)
    .updateOne(
      { token },
      { $set: { userId, token, platform, updatedAt: new Date() } },
      { upsert: true }
    );
}

export async function removeExpoPushToken(userId: string, token: string): Promise<void> {
  await database.getDb().collection(EXPO_TOKENS_COLLECTION).deleteOne({ userId, token });
}

async function sendExpoPush(userId: string, payload: PushPayload): Promise<number> {
  const db = database.getDb();
  const records = await db.collection(EXPO_TOKENS_COLLECTION).find({ userId }).toArray();
  if (!records.length) return 0;

  const messages = records.map((record) => ({
    to: record.token,
    title: payload.title,
    body: payload.body,
    data: { url: payload.url },
    sound: 'default',
  }));

  try {
    const response = await axios.post<{ data: ExpoPushTicket[] }>(EXPO_PUSH_URL, messages, {
      timeout: EXPO_PUSH_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
    const tickets = response.data.data ?? [];
    const staleTokens = tickets
      .map((ticket, index) =>
        ticket.details?.error === EXPO_DEVICE_NOT_REGISTERED ? records[index].token : null
      )
      .filter((token): token is string => token !== null);
    if (staleTokens.length) {
      await db.collection(EXPO_TOKENS_COLLECTION).deleteMany({ token: { $in: staleTokens } });
    }
    return tickets.filter((ticket) => ticket.status === 'ok').length;
  } catch (err) {
    logger.warn({ err }, 'Expo push delivery failed');
    return 0;
  }
}

export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  const deliveredToApps = await sendExpoPush(userId, payload);
  return deliveredToApps + (await sendWebPush(userId, payload));
}

async function sendWebPush(userId: string, payload: PushPayload): Promise<number> {
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
