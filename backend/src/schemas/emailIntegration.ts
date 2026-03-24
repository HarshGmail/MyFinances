import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const emailIntegrationSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  email: z.string().email(),
  refreshToken: z.string(), // AES-256-GCM encrypted
  linkedAt: z.date(),
  lastSyncAt: z.date().nullable(),
  safegoldSender: z.string().default('estatements@safegold.in'),
});

export type EmailIntegration = z.infer<typeof emailIntegrationSchema>;
