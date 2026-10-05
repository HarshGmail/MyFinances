import type { ParsedGoldLease } from './safegoldLeaseParser';

const LESSEE_RE = /Lessee\s+Name\s*:\s*(.+)/i;
const YIELD_RE = /Yield\s*:\s*([\d.]+)\s*%/i;
const TENURE_RE = /Bailment\s+Tenure\s*:\s*(\d+)\s*days/i;
const BAILED_AMOUNT_RE = /Bailed\s+Precious\s+Metal\s*(?:Amount)?\s*:?\s*([\d.]+)\s*gms/i;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BailmentContext {
  commitId: string;
  appliedOn: Date;
}

function cleanBorrower(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[.,]+$/, '')
    .trim();
}

export function commitIdFromFilename(filename: string): string | null {
  const digits = filename.match(/(\d{4,})/);
  return digits ? digits[1] : null;
}

export function parseBailmentPdf(text: string, context: BailmentContext): ParsedGoldLease | null {
  const normalised = text.replace(/\u00a0/g, ' ');
  const lessee = normalised.match(LESSEE_RE);
  const yieldMatch = normalised.match(YIELD_RE);
  const tenureMatch = normalised.match(TENURE_RE);
  const amountMatch = normalised.match(BAILED_AMOUNT_RE);

  if (!lessee || !amountMatch) return null;

  const borrower = cleanBorrower(lessee[1]);
  const leasedGrams = Number(amountMatch[1]);
  if (!borrower || !Number.isFinite(leasedGrams) || leasedGrams <= 0) return null;

  const tenureDays = tenureMatch ? Number(tenureMatch[1]) : 0;
  const yieldPercent = yieldMatch ? Number(yieldMatch[1]) : 0;
  const endDate = new Date(context.appliedOn.getTime() + tenureDays * DAY_MS);

  return {
    commitId: context.commitId,
    borrower,
    leasedGrams,
    earnedGrams: 0,
    yieldPercent,
    startDate: context.appliedOn,
    endDate,
    tenureDays,
    remainingPayouts: 0,
    payouts: [],
    statementMonth: null,
  };
}
