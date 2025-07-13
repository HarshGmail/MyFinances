import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Zod schema for validation
export const stocksSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  type: z.enum(['credit', 'debit']),
  date: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()),
  marketPrice: z.number().positive(),
  numOfShares: z.number().positive(),
  amount: z.number().nonnegative(),
  stockName: z.string(),
});

// TypeScript type for stocks
export type stocks = z.infer<typeof stocksSchema>;
