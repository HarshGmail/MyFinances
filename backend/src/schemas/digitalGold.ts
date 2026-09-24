import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { GOLD_CATEGORIES } from '../services/safegoldParser';

// Zod schema for validation
export const digitalGoldSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  type: z.enum(['credit', 'debit']),
  date: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()),
  goldPrice: z.number().nonnegative(),
  quantity: z.number().positive(),
  amount: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  platform: z.string().optional(),
  category: z.enum(GOLD_CATEGORIES).optional(),
  borrower: z.string().optional(),
  leasedGrams: z.number().positive().optional(),
});

// TypeScript type for digitalGold
export type DigitalGold = z.infer<typeof digitalGoldSchema>;
