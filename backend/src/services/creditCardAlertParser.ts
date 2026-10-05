import type { CreditCardIssuer } from '../schemas/creditCard';
import { htmlToText } from './coinDCXEmailParser';
import { classifyCardLine, parseStatementDate } from './creditCardStatementParser';

export interface ParsedCardAlert {
  date: Date;
  description: string;
  amount: number;
  category: string;
  lastDigits: string | null;
}

const AMOUNT_SRC = '(?:Rs\\.?|INR|₹)\\s*([\\d,]+(?:\\.\\d{1,2})?)';
const ENDING_SRC = 'ending\\s*(?:with|in)?\\s*:?\\s*(\\d{4,6})';
const LABELLED_LAST_DIGITS_SRC = 'Card\\s*No\\.?\\s*[:\\s]*(?:X{2,}|\\*{2,})?(\\d{4,6})';
const ALERT_DATE_SRC = '(\\d{1,2}[-/]\\d{1,2}[-/]\\d{2,4}|\\d{1,2}\\s+[A-Za-z]{3,}\\s+\\d{4})';

const ENDING_RE = new RegExp(ENDING_SRC, 'i');
const LABELLED_LAST_DIGITS_RE = new RegExp(LABELLED_LAST_DIGITS_SRC, 'i');

const SPENT_AT_RE = new RegExp(
  `${AMOUNT_SRC}\\s+(?:has\\s+been\\s+)?spent\\s+on\\s+your[^]*?\\bat\\s+(.+?)\\s+on\\s+${ALERT_DATE_SRC}`,
  'i'
);
const TRANSACTION_OF_AT_RE = new RegExp(
  `transaction\\s+of\\s+${AMOUNT_SRC}\\s+at\\s+(.+?)\\s+on\\s+${ALERT_DATE_SRC}`,
  'i'
);
const USED_FOR_PAYMENT_RE = new RegExp(
  `used\\s+for\\s+${AMOUNT_SRC}\\s+for\\s+payment\\s+to\\s+(.+?)\\s+on\\s+${ALERT_DATE_SRC}`,
  'i'
);

const MERCHANT_LABEL_RE = /Merchant\s*Name\s*:\s*(.+)/i;
const CARD_NO_LABEL_RE =
  /\s*[A-Za-z]+\s+Bank\s+Credit\s*Card\s*No\.?|\s*Credit\s*Card\s*No\.?|\s*Card\s*No\.?/i;
const TRANSACTION_AMOUNT_LABEL_RE = new RegExp(
  `Transaction\\s*Amount\\s*[:\\s]+${AMOUNT_SRC}`,
  'i'
);
const DATE_TIME_LABEL_RE = new RegExp(
  `Date\\s*(?:&|and)?\\s*Time\\s*[:\\s]+${ALERT_DATE_SRC}`,
  'i'
);

function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

function cleanMerchant(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[.,]+$/, '')
    .trim();
}

interface NarrativeMatch {
  amount: string;
  merchant: string;
  date: string;
}

function matchNarrative(text: string): NarrativeMatch | null {
  for (const pattern of [SPENT_AT_RE, TRANSACTION_OF_AT_RE, USED_FOR_PAYMENT_RE]) {
    const match = text.match(pattern);
    if (match) return { amount: match[1], merchant: match[2], date: match[3] };
  }
  return null;
}

function labelledMerchant(text: string): string | null {
  const match = text.match(MERCHANT_LABEL_RE);
  if (!match) return null;
  const afterLabel = match[1];
  const cardNo = afterLabel.match(CARD_NO_LABEL_RE);
  const dateTime = afterLabel.match(/Date\s*(?:&|and)?\s*Time\s*:/i);
  const stopAt = Math.min(cardNo?.index ?? afterLabel.length, dateTime?.index ?? afterLabel.length);
  return afterLabel.slice(0, stopAt);
}

function matchLabelled(text: string): NarrativeMatch | null {
  const amount = text.match(TRANSACTION_AMOUNT_LABEL_RE);
  const merchant = labelledMerchant(text);
  const date = text.match(DATE_TIME_LABEL_RE);
  if (!amount || !merchant || !date) return null;
  return { amount: amount[1], merchant, date: date[1] };
}

function extractLastDigits(text: string): string | null {
  const ending = text.match(ENDING_RE);
  if (ending) return ending[1];
  const labelled = text.match(LABELLED_LAST_DIGITS_RE);
  return labelled ? labelled[1] : null;
}

export function parseCardAlert(html: string, issuer: CreditCardIssuer): ParsedCardAlert | null {
  void issuer;
  const text = htmlToText(html).replace(/\u00a0/g, ' ');
  const parsed = matchNarrative(text) ?? matchLabelled(text);
  if (!parsed) return null;

  const amount = parseAmount(parsed.amount);
  const date = parseStatementDate(parsed.date);
  if (!date || !Number.isFinite(amount) || amount <= 0) return null;

  const description = cleanMerchant(parsed.merchant);
  if (description.length < 2) return null;

  const { category } = classifyCardLine(description, 'debit');
  return {
    date,
    description,
    amount,
    category,
    lastDigits: extractLastDigits(text),
  };
}

export function alertMentionsCard(html: string, lastDigits: string): boolean {
  const digits = lastDigits.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  if (!last4) return false;
  const text = htmlToText(html);
  const match = extractLastDigits(text);
  if (!match) return false;
  return match.slice(-4) === last4;
}
