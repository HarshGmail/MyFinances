import { z } from 'zod';

const transactionType = z.enum(['credit', 'debit'], { required_error: 'Type is required' });

const pastOrToday = z
  .date({ required_error: 'Date is required' })
  .refine((date) => date <= new Date(), { message: 'Date cannot be in the future' });

export const stockTransactionSchema = z.object({
  type: transactionType,
  date: pastOrToday,
  marketPrice: z.number().min(0, 'Stock price must be at least 0'),
  numOfShares: z.number().min(0, 'Quantity must be at least 0'),
  stockName: z.string().min(1, 'Stock name is required'),
});

export const cryptoTransactionSchema = z.object({
  type: transactionType,
  date: pastOrToday,
  coinPrice: z.number().min(0, 'Coin price must be at least 0'),
  quantity: z.number().min(0, 'Quantity must be at least 0'),
  amount: z.number().min(0, 'Amount must be at least 0'),
  coinName: z.string().min(1, 'Coin name is required'),
  coinSymbol: z.string().min(1, 'Coin symbol is required'),
});

export const goldTransactionSchema = z.object({
  type: transactionType,
  date: pastOrToday,
  quantity: z.number().min(0, 'Quantity must be at least 0'),
  amount: z.number().min(0, 'Amount must be at least 0'),
  platform: z.string().optional(),
});

export const epfAccountSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  epfAmount: z.number().min(1, 'EPF amount must be greater than 0'),
  creditDay: z.number().min(1).max(31),
  startDate: z.date(),
});

export const fixedDepositSchema = z.object({
  fixedDepositName: z.string().min(1, 'FD name is required'),
  amountInvested: z.number().min(1, 'Amount must be greater than 0'),
  rateOfInterest: z.number().min(0.1, 'Interest rate is required'),
  platform: z.string().optional(),
  dateOfCreation: z.string().min(1, 'Creation date is required'),
  dateOfMaturity: z.string().min(1, 'Maturity date is required'),
});

export const recurringDepositSchema = fixedDepositSchema.omit({ fixedDepositName: true }).extend({
  recurringDepositName: z.string().min(1, 'RD name is required'),
  monthlyDeposit: z.number().min(1, 'Monthly deposit amount is required'),
});

export const mutualFundTransactionSchema = z.object({
  type: transactionType,
  date: pastOrToday,
  amount: z.number().min(1, 'Amount must be at least 1'),
  units: z.number().min(0.001, 'Units must be greater than 0'),
});

export type StockTransactionValues = z.infer<typeof stockTransactionSchema>;
export type CryptoTransactionValues = z.infer<typeof cryptoTransactionSchema>;
export type GoldTransactionValues = z.infer<typeof goldTransactionSchema>;
export type EpfAccountValues = z.infer<typeof epfAccountSchema>;
export type FixedDepositValues = z.infer<typeof fixedDepositSchema>;
export type RecurringDepositValues = z.infer<typeof recurringDepositSchema>;
export type MutualFundTransactionValues = z.infer<typeof mutualFundTransactionSchema>;

const GOLD_GST_RATE = 0.03;

export function goldTransactionPayload(values: GoldTransactionValues) {
  const goldPrice = values.quantity > 0 ? values.amount / values.quantity : 0;
  return {
    ...values,
    goldPrice: Number(goldPrice.toFixed(2)),
    tax: Number((values.amount * GOLD_GST_RATE).toFixed(2)),
    platform: values.platform || undefined,
  };
}
