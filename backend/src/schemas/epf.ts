import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const epfSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  organizationName: z.string(),
  epfAmount: z.number().positive(),
  creditDay: z.number().min(1).max(31),
  startDate: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()),
  createdAt: z.preprocess(() => new Date(), z.date()).optional(),
  updatedAt: z.preprocess(() => new Date(), z.date()).optional(),
});

export type epf = z.infer<typeof epfSchema>;
