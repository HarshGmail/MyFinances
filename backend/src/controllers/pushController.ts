import { Request, Response } from 'express';
import { z, ZodError } from 'zod';
import config from '../config';
import { getUserFromRequest } from '../utils/jwtHelpers';
import { isPushConfigured, removeSubscription, saveSubscription } from '../services/pushService';
import logger from '../utils/logger';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

export function getPushConfig(_req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      enabled: isPushConfigured(),
      publicKey: config.VAPID_PUBLIC_KEY ?? null,
    },
  });
}

export async function subscribeToPush(req: Request, res: Response) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const subscription = subscriptionSchema.parse(req.body);
    await saveSubscription(user.userId, subscription);
    res.json({ success: true, message: 'Push subscription saved' });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Invalid push subscription' });
      return;
    }
    logger.error({ err }, 'Failed to save push subscription');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function unsubscribeFromPush(req: Request, res: Response) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const { endpoint } = unsubscribeSchema.parse(req.body);
    await removeSubscription(user.userId, endpoint);
    res.json({ success: true, message: 'Push subscription removed' });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Invalid endpoint' });
      return;
    }
    logger.error({ err }, 'Failed to remove push subscription');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
