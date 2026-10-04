import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const CREDIT_CARD_ISSUERS = [
  'sbi',
  'hdfc',
  'icici',
  'axis',
  'hsbc',
  'yes',
  'other',
] as const;
export const CARD_PASSWORD_SOURCES = ['user', 'derived'] as const;
export const CARD_TRANSACTION_KINDS = [
  'purchase',
  'payment',
  'refund',
  'cashback',
  'emi_principal',
  'emi_interest',
  'tax',
  'fee',
  'interest',
  'other',
] as const;
export const CARD_TRANSACTION_DIRECTIONS = ['debit', 'credit'] as const;

const toDate = (arg: unknown) => (typeof arg === 'string' ? new Date(arg) : arg);

const senderEmailsSchema = z
  .array(z.string().trim().toLowerCase().email())
  .min(1)
  .transform((emails) => [...new Set(emails)]);

const cardIdentityFields = {
  issuer: z.enum(CREDIT_CARD_ISSUERS),
  label: z.string().trim().min(1),
  lastDigits: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/),
  nameOnCard: z.string().trim().optional(),
  senderEmails: senderEmailsSchema,
};

export const creditCardSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  ...cardIdentityFields,
  pdfPassword: z.string().nullable().optional(),
  passwordSource: z.enum(CARD_PASSWORD_SOURCES).nullable(),
  passwordHint: z.string().optional(),
  lastSyncAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const creditCardInputSchema = z.object({
  ...cardIdentityFields,
  pdfPassword: z.string().optional(),
});

export const creditCardUpdateSchema = creditCardInputSchema.partial();

export const emiInstallmentSchema = z.object({
  number: z.number().int().positive(),
  of: z.number().int().positive(),
});

export const creditCardStatementSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  cardId: z.instanceof(ObjectId),
  periodStart: z.preprocess(toDate, z.date()).nullable(),
  periodEnd: z.preprocess(toDate, z.date()),
  statementDate: z.preprocess(toDate, z.date()).optional(),
  dueDate: z.preprocess(toDate, z.date()).optional(),
  totalDue: z.number(),
  minimumDue: z.number().optional(),
  previousBalance: z.number().optional(),
  creditLimit: z.number().optional(),
  availableLimit: z.number().optional(),
  reconciled: z.boolean(),
  gmailMessageId: z.string().optional(),
  parsedAt: z.date(),
});

export const creditCardTransactionSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  cardId: z.instanceof(ObjectId),
  statementId: z.instanceof(ObjectId),
  date: z.preprocess(toDate, z.date()),
  description: z.string(),
  amount: z.number().nonnegative(),
  direction: z.enum(CARD_TRANSACTION_DIRECTIONS),
  kind: z.enum(CARD_TRANSACTION_KINDS),
  category: z.string(),
  emiInstallment: emiInstallmentSchema.optional(),
});

export type CreditCardIssuer = (typeof CREDIT_CARD_ISSUERS)[number];
export type CardPasswordSource = (typeof CARD_PASSWORD_SOURCES)[number];
export type CardTransactionKind = (typeof CARD_TRANSACTION_KINDS)[number];
export type CardTransactionDirection = (typeof CARD_TRANSACTION_DIRECTIONS)[number];
export type EmiInstallment = z.infer<typeof emiInstallmentSchema>;
export type CreditCardDocument = z.infer<typeof creditCardSchema>;
export type CreditCardInput = z.infer<typeof creditCardInputSchema>;
export type CreditCardStatementDocument = z.infer<typeof creditCardStatementSchema>;
export type CreditCardTransactionDocument = z.infer<typeof creditCardTransactionSchema>;
