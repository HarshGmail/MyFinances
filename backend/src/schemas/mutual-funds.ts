import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Zod schema for validation
export const mutualFundSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  type: z.enum(['credit', 'debit']),
  date: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()),
  numOfUnits: z.number().positive(),
  amount: z.number().nonnegative(),
  platform: z.string().optional(),
  fundName: z.string(),
});

// TypeScript type for mutualFund
export type MutualFund = z.infer<typeof mutualFundSchema>;
