import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Zod schema for validation
export const userSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  dob: z.date().optional(),
  monthlySalary: z.number().optional(),
  password: z.string().min(6),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof userSchema>;

export const userInputSchema = userSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserInput = z.infer<typeof userInputSchema>;

// Helper function to create a new user document
export function createUser(userData: UserInput): Omit<User, '_id'> {
  const now = new Date();
  const parsed = userInputSchema.parse(userData);
  return {
    ...parsed,
    createdAt: now,
    updatedAt: now,
  };
}

// Helper function to update user document
export function updateUser(existingUser: User, updates: Partial<UserInput>): User {
  const parsedUpdates = userInputSchema.partial().parse(updates);
  return {
    ...existingUser,
    ...parsedUpdates,
    updatedAt: new Date(),
  };
}
