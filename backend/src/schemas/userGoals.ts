import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const userGoalSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  goalName: z.string().min(1),
  stockSymbols: z.array(z.string()).optional(),
  mutualFundIds: z.array(z.instanceof(ObjectId)).optional(),
  cryptoCurrency: z.array(z.string()).optional(),
  goldAlloted: z.number().nonnegative().optional(),
  description: z.string().optional(),
  targetAmount: z.number().nonnegative().optional(),
});
export type UserGoal = z.infer<typeof userGoalSchema>;
