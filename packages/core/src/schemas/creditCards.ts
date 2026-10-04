import { z } from 'zod';
import type { CardTransactionKind, CreditCardIssuer, CreditCardPayload } from '../types';

export const CARD_ISSUERS: readonly { value: CreditCardIssuer; label: string }[] = [
  { value: 'sbi', label: 'SBI Card' },
  { value: 'hdfc', label: 'HDFC Bank' },
  { value: 'icici', label: 'ICICI Bank' },
  { value: 'axis', label: 'Axis Bank' },
  { value: 'hsbc', label: 'HSBC' },
  { value: 'yes', label: 'YES Bank' },
  { value: 'other', label: 'Other' },
];

const ISSUER_VALUES = ['sbi', 'hdfc', 'icici', 'axis', 'hsbc', 'yes', 'other'] as const;

export const KNOWN_CARD_SENDERS: readonly { email: string; issuer: CreditCardIssuer }[] = [
  { email: 'statements@sbicard.com', issuer: 'sbi' },
  { email: 'creditcardstatement@mail.hsbc.co.in', issuer: 'hsbc' },
  { email: 'emailstatements.cards@hdfcbank.bank.in', issuer: 'hdfc' },
  { email: 'credit_cards@icici.bank.in', issuer: 'icici' },
  { email: 'estatement@icici.bank.in', issuer: 'icici' },
  { email: 'estatement@yes.bank.in', issuer: 'yes' },
  { email: 'liccardsstatements@axis.bank.in', issuer: 'axis' },
];

export const CARD_TRANSACTION_KINDS: readonly { value: CardTransactionKind; label: string }[] = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'payment', label: 'Payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'emi_principal', label: 'EMI principal' },
  { value: 'emi_interest', label: 'EMI interest' },
  { value: 'tax', label: 'GST / tax' },
  { value: 'fee', label: 'Fee' },
  { value: 'interest', label: 'Finance charge' },
  { value: 'other', label: 'Other' },
];

export const COST_OF_CREDIT_KINDS: readonly CardTransactionKind[] = [
  'emi_interest',
  'tax',
  'fee',
  'interest',
];

export function issuerLabel(issuer: CreditCardIssuer): string {
  return CARD_ISSUERS.find((entry) => entry.value === issuer)?.label ?? issuer;
}

export function cardTransactionKindLabel(kind: CardTransactionKind): string {
  return CARD_TRANSACTION_KINDS.find((entry) => entry.value === kind)?.label ?? kind;
}

export function knownSendersForIssuer(issuer: CreditCardIssuer): string[] {
  return KNOWN_CARD_SENDERS.filter((sender) => sender.issuer === issuer).map(
    (sender) => sender.email
  );
}

export const creditCardFormSchema = z.object({
  issuer: z.enum(ISSUER_VALUES),
  label: z.string().trim().min(1, 'Give the card a name'),
  lastDigits: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, 'Enter the last 4 to 6 digits of the card'),
  nameOnCard: z.string().trim().optional(),
  senderEmails: z
    .array(z.string().trim().toLowerCase().email('Not a valid email'))
    .min(1, 'Pick at least one sender email'),
  pdfPassword: z.string().optional(),
});

export type CreditCardFormValues = z.infer<typeof creditCardFormSchema>;

export function creditCardFormToPayload(values: CreditCardFormValues): CreditCardPayload {
  return {
    issuer: values.issuer,
    label: values.label.trim(),
    lastDigits: values.lastDigits.trim(),
    nameOnCard: values.nameOnCard?.trim() || undefined,
    senderEmails: [...new Set(values.senderEmails.map((email) => email.trim().toLowerCase()))],
    pdfPassword: values.pdfPassword || undefined,
  };
}
