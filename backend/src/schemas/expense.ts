import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Zod schema for validation
export const expenseSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  tag: z.string(),
  expenseAmount: z.number().positive(),
  expenseName: z.string(),
  expenseFrequency: z.string(),
});

// TypeScript type for expense
export type crypto = z.infer<typeof expenseSchema>;
