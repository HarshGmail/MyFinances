import { z } from 'zod';

export interface MonthlyData {
  month: Date;
  monthStr: string;
  salary: number;
  actualPaid: number;
  bonus: number;
  arrears: number;
  totalInvestments: number;
  fixedExpenses: number;
  variableExpenses: number;
  totalExpenses: number;
  discretionarySpending: number;
  savingsRate: number;
  investmentsByType: Record<string, number>;
  expensesByCategory: Record<string, number>;
}

export const expenseSchema = z.object({
  tag: z.string().min(1, 'Tag is required'),
  expenseAmount: z.number().min(0.01, 'Amount must be greater than 0'),
  expenseName: z.string().min(1, 'Name is required'),
  expenseFrequency: z.enum(['one-time', 'daily', 'weekly', 'monthly', 'yearly']),
  isFixed: z.boolean(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const trackerSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  name: z.string().min(1, 'Name is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
});

export type TrackerFormValues = z.infer<typeof trackerSchema>;

export const EXPENSE_TAGS = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Personal Care',
  'Rent',
  'Insurance',
  'Others',
] as const;

export const FIXED_EXPENSE_TAGS = ['Rent', 'Insurance', 'Bills & Utilities'];

export const EXPENSE_FREQUENCIES = [
  { value: 'one-time', label: 'One Time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;
