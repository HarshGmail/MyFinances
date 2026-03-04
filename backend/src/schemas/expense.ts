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
  isFixed: z.boolean().optional().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// TypeScript type for expense
export type expense = z.infer<typeof expenseSchema>;
