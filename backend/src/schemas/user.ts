import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Schema for salary structure changes (base salary changes)
export const salaryRecordSchema = z.object({
  baseSalary: z.number().positive(),
  effectiveDate: z.date(), // When the new salary actually started applying
  notes: z.string().optional(), // e.g., "36% hike", "Promotion", etc.
});

export type SalaryRecord = z.infer<typeof salaryRecordSchema>;

// Schema for actual monthly payments (what you actually received)
export const monthlyPaymentSchema = z.object({
  month: z.date(), // First day of the month (e.g., 2024-10-01)
  baseAmount: z.number().positive(), // Regular salary for that month
  bonus: z.number().default(0), // Any bonus received
  arrears: z.number().default(0), // Arrears from previous months
  totalPaid: z.number().positive(), // Total amount paid that month
  notes: z.string().optional(), // e.g., "Includes Oct arrears", "Performance bonus"
});

export type MonthlyPayment = z.infer<typeof monthlyPaymentSchema>;

// Zod schema for validation
export const userSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  dob: z.date().optional(),
  salaryHistory: z.array(salaryRecordSchema).default([]), // Track base salary changes
  paymentHistory: z.array(monthlyPaymentSchema).default([]), // Track actual payments
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

// Helper function to add a new salary record (for hikes/promotions)
export function addSalaryRecord(
  existingUser: User,
  salaryRecord: Omit<SalaryRecord, 'effectiveDate'> & { effectiveDate?: Date }
): User {
  const newRecord = salaryRecordSchema.parse({
    ...salaryRecord,
    effectiveDate: salaryRecord.effectiveDate || new Date(),
  });

  // Sort salary history by effectiveDate (newest first)
  const updatedHistory = [...existingUser.salaryHistory, newRecord].sort(
    (a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime()
  );

  return {
    ...existingUser,
    salaryHistory: updatedHistory,
    updatedAt: new Date(),
  };
}

// Helper function to add a monthly payment record
export function addMonthlyPayment(existingUser: User, payment: MonthlyPayment): User {
  const newPayment = monthlyPaymentSchema.parse(payment);

  // Sort payment history by month (newest first)
  const updatedPayments = [...existingUser.paymentHistory, newPayment].sort(
    (a, b) => b.month.getTime() - a.month.getTime()
  );

  return {
    ...existingUser,
    paymentHistory: updatedPayments,
    updatedAt: new Date(),
  };
}

// Helper function to get current base salary
export function getCurrentBaseSalary(user: User): number | null {
  if (user.salaryHistory.length === 0) return null;

  // Find the most recent salary (based on effectiveDate <= now)
  const now = new Date();
  const currentSalary = user.salaryHistory
    .filter((record) => record.effectiveDate <= now)
    .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime())[0];

  return currentSalary?.baseSalary ?? null;
}

// Helper function to get base salary at a specific date
export function getBaseSalaryAtDate(user: User, date: Date): number | null {
  if (user.salaryHistory.length === 0) return null;

  const applicableSalary = user.salaryHistory
    .filter((record) => record.effectiveDate <= date)
    .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime())[0];

  return applicableSalary?.baseSalary ?? null;
}
