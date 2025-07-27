import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const recurringDepositSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  dateOfCreation: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()),
  dateOfMaturity: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()),
  amountInvested: z.number().nonnegative(),
  platform: z.string().optional(),
  recurringDepositName: z.string(),
  rateOfInterest: z.number(),
});

export type RecurringDeposit = z.infer<typeof recurringDepositSchema>;
