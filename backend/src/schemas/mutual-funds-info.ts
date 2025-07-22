import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Zod schema for validation
export const mutualFundInfoSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  date: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()),
  sipAmount: z.number().nonnegative(),
  platform: z.string().optional(),
  fundName: z.string(),
  schemeNumber: z.number(),
});

// TypeScript type for mutualFundInfo
export type MutualFundInfo = z.infer<typeof mutualFundInfoSchema>;
