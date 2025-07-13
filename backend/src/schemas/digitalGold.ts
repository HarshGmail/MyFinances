import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Zod schema for validation
export const digitalGoldSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  type: z.enum(['credit', 'debit']),
  date: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()),
  goldPrice: z.number().positive(),
  quantity: z.number().positive(),
  amount: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  platform: z.string().optional(),
});

// TypeScript type for digitalGold
export type DigitalGold = z.infer<typeof digitalGoldSchema>;
