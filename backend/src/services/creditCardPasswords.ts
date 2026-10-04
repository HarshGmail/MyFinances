import type { CreditCardIssuer } from '../schemas/creditCard';
import { htmlToText } from './coinDCXEmailParser';

export const KNOWN_CARD_SENDERS: readonly { email: string; issuer: CreditCardIssuer }[] = [
  { email: 'statements@sbicard.com', issuer: 'sbi' },
  { email: 'creditcardstatement@mail.hsbc.co.in', issuer: 'hsbc' },
  { email: 'emailstatements.cards@hdfcbank.bank.in', issuer: 'hdfc' },
  { email: 'credit_cards@icici.bank.in', issuer: 'icici' },
  { email: 'estatement@icici.bank.in', issuer: 'icici' },
  { email: 'estatement@yes.bank.in', issuer: 'yes' },
  { email: 'liccardsstatements@axis.bank.in', issuer: 'axis' },
];

const HONORIFICS = new Set(['MR', 'MRS', 'MS', 'MISS', 'DR', 'SHRI', 'SMT']);
const MAX_HINT_LENGTH = 300;
const PASSWORD_MENTION_RE = /password/i;

export function issuerForSender(email: string): CreditCardIssuer | null {
  const normalised = email.trim().toLowerCase();
  return KNOWN_CARD_SENDERS.find((sender) => sender.email === normalised)?.issuer ?? null;
}

export interface CardPasswordInput {
  issuer: CreditCardIssuer;
  name: string;
  dob?: Date | null;
  lastDigits: string;
}

interface NameParts {
  first: string;
  surname: string;
}

interface DobParts {
  ddmm: string;
  ddmmyy: string;
  ddmmyyyy: string;
}

interface CandidateContext {
  name: NameParts;
  dob: DobParts | null;
  last4: string;
  last6: string | null;
}

function splitName(fullName: string): NameParts {
  const words = fullName
    .toUpperCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Z]/g, ''))
    .filter((word) => word.length > 0 && !HONORIFICS.has(word));
  return { first: words.join(''), surname: words[words.length - 1] ?? '' };
}

const padTwo = (value: number) => String(value).padStart(2, '0');

function formatDob(dob: Date | null | undefined): DobParts | null {
  if (!dob || Number.isNaN(dob.getTime())) return null;
  const dd = padTwo(dob.getUTCDate());
  const mm = padTwo(dob.getUTCMonth() + 1);
  const yyyy = String(dob.getUTCFullYear());
  return { ddmm: dd + mm, ddmmyy: dd + mm + yyyy.slice(-2), ddmmyyyy: dd + mm + yyyy };
}

const upperPrefix = (letters: string, length: number) => letters.slice(0, length).toUpperCase();
const lowerPrefix = (letters: string, length: number) => letters.slice(0, length).toLowerCase();

function issuerRuleCandidates(issuer: CreditCardIssuer, ctx: CandidateContext): string[] {
  const first4 = upperPrefix(ctx.name.first, 4);
  const first4Lower = lowerPrefix(ctx.name.first, 4);
  const surname4 = upperPrefix(ctx.name.surname, 4);
  const dob = ctx.dob;

  switch (issuer) {
    case 'sbi':
      return dob ? [first4 + dob.ddmm, first4 + dob.ddmmyyyy] : [];
    case 'icici':
      return dob ? [first4Lower + dob.ddmm, first4 + dob.ddmm] : [];
    case 'axis':
      return [...(dob ? [first4 + dob.ddmm] : []), first4 + ctx.last4];
    case 'hsbc':
      return dob
        ? [
            surname4 + dob.ddmm,
            ...(ctx.last6 ? [dob.ddmmyy + ctx.last6] : []),
            dob.ddmmyy + ctx.last4,
          ]
        : [];
    case 'hdfc':
      return [
        ...(dob ? [first4 + dob.ddmm] : []),
        first4 + ctx.last4,
        ...(dob ? [first4Lower + dob.ddmm] : []),
      ];
    case 'yes':
      return dob ? [dob.ddmmyyyy, first4 + dob.ddmm] : [];
    default:
      return [];
  }
}

function genericCandidates(ctx: CandidateContext): string[] {
  const candidates: string[] = [];
  const dob = ctx.dob;
  const lastDigitRuns = [ctx.last4, ...(ctx.last6 ? [ctx.last6] : [])];

  if (dob) {
    const dobFormats = [dob.ddmm, dob.ddmmyy, dob.ddmmyyyy];
    for (const length of [3, 4]) {
      for (const prefix of [
        upperPrefix(ctx.name.first, length),
        lowerPrefix(ctx.name.first, length),
      ]) {
        if (prefix.length < length) continue;
        candidates.push(...dobFormats.map((format) => prefix + format));
      }
    }
    if (ctx.name.surname.length >= 4) candidates.push(upperPrefix(ctx.name.surname, 4) + dob.ddmm);
    candidates.push(dob.ddmmyyyy, dob.ddmmyy, dob.ddmm);
    for (const format of dobFormats) {
      candidates.push(...lastDigitRuns.map((digits) => format + digits));
    }
  }

  candidates.push(...lastDigitRuns);
  return candidates;
}

function dedupeNonEmpty(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

export function buildCardPasswordCandidates({
  issuer,
  name,
  dob,
  lastDigits,
}: CardPasswordInput): string[] {
  const digits = lastDigits.replace(/\D/g, '');
  const ctx: CandidateContext = {
    name: splitName(name),
    dob: formatDob(dob),
    last4: digits.slice(-4),
    last6: digits.length >= 6 ? digits.slice(-6) : null,
  };
  const hasNameLetters = ctx.name.first.length >= 4;
  const ruleCandidates = issuerRuleCandidates(issuer, ctx).filter(
    (candidate) => hasNameLetters || /^\d+$/.test(candidate)
  );
  return dedupeNonEmpty([...ruleCandidates, ...genericCandidates(ctx)]);
}

const NON_CONTENT_BLOCK_RE = /<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi;
const BLOCK_BOUNDARY_RE = /<br\s*\/?>|<\/(?:p|div|td|th|tr|li|h[1-6]|table)>/gi;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function extractPasswordHint(html: string): string | undefined {
  const blocks = html
    .replace(NON_CONTENT_BLOCK_RE, ' ')
    .replace(/&nbsp;/gi, ' ')
    .split(BLOCK_BOUNDARY_RE)
    .map((block) => htmlToText(block))
    .filter(Boolean);
  const sentence = blocks
    .flatMap(splitSentences)
    .find((candidate) => PASSWORD_MENTION_RE.test(candidate));
  return sentence ? sentence.slice(0, MAX_HINT_LENGTH).trim() : undefined;
}
