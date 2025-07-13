import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Zod schema for validation
export const cryptoSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  type: z.enum(['credit', 'debit']),
  date: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()),
  coinPrice: z.number().positive(),
  quantity: z.number().positive(),
  amount: z.number().nonnegative(),
  coinName: z.string(),
  coinSymbol: z.string(),
});

// TypeScript type for digitalGold
export type crypto = z.infer<typeof cryptoSchema>;
