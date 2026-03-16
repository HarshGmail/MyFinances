import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const expenseTransactionSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  date: z.date(),
  name: z.string().min(1),
  amount: z.number().positive(),
  category: z.string(),
  reason: z.string().optional(),
  categoryUmbrella: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ExpenseTransaction = z.infer<typeof expenseTransactionSchema>;
