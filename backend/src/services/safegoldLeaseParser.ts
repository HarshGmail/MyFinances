export interface ParsedLeasePayout {
  date: Date;
  grams: number;
}

export interface ParsedGoldLease {
  commitId: string;
  borrower: string;
  leasedGrams: number;
  earnedGrams: number;
  yieldPercent: number;
  startDate: Date;
  endDate: Date;
  tenureDays: number;
  remainingPayouts: number;
  payouts: ParsedLeasePayout[];
  statementMonth: Date | null;
}

const SHORT_MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const SHORT_DATE = String.raw`(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})`;
const PAGE_BREAK_RE = /^--\s*\d+\s+of\s+\d+\s*--$/m;
const PAYOUT_ROW_RE = new RegExp(`^${SHORT_DATE}\\s+([\\d.]+)\\s*gm?$`, 'gim');

function parseShortDate(day: string, month: string, year: string): Date | null {
  const monthIndex = SHORT_MONTHS[month.slice(0, 3).toLowerCase()];
  if (monthIndex === undefined) return null;
  return new Date(Date.UTC(Number(year), monthIndex, Number(day)));
}

function matchNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  return match ? parseFloat(match[1]) : null;
}

function matchDateAfter(text: string, label: string): Date | null {
  const match = text.match(new RegExp(`${label}\\s+${SHORT_DATE}`, 'i'));
  return match ? parseShortDate(match[1], match[2], match[3]) : null;
}

function parseLeasePage(page: string): ParsedGoldLease | null {
  const header = page.match(/^\s*(.+?)\s+Commit ID:\s*(\d+)/m);
  const statementMonthMatch = page.match(/Lease Statement\s+([A-Za-z]+)\s+(\d{4})/i);
  const statementMonth = statementMonthMatch
    ? parseShortDate('1', statementMonthMatch[1], statementMonthMatch[2])
    : null;
  const leasedGrams = matchNumber(page, /Leased gold\s+([\d.]+)\s*gm/i);
  const earnedGrams = matchNumber(page, /Earned gold\s+([\d.]+)\s*gm/i);
  const yieldPercent = matchNumber(page, /Yield\s+([\d.]+)\s*%/i);
  const tenureDays = matchNumber(page, /Tenure\s+(\d+)\s+Days/i);
  const remainingPayouts = matchNumber(page, /Remaining payouts:\s*(\d+)/i);
  const startDate = matchDateAfter(page, 'Start date');
  const endDate = matchDateAfter(page, 'End date');

  if (!header || leasedGrams === null || yieldPercent === null || !startDate || !endDate) {
    return null;
  }

  const payouts: ParsedLeasePayout[] = [];
  for (const row of page.matchAll(PAYOUT_ROW_RE)) {
    const date = parseShortDate(row[1], row[2], row[3]);
    if (date) payouts.push({ date, grams: parseFloat(row[4]) });
  }

  return {
    commitId: header[2],
    borrower: header[1].trim(),
    leasedGrams,
    earnedGrams: earnedGrams ?? 0,
    yieldPercent,
    startDate,
    endDate,
    tenureDays: tenureDays ?? 0,
    remainingPayouts: remainingPayouts ?? 0,
    payouts,
    statementMonth,
  };
}

export function parseSafeGoldLeaseStatement(text: string): ParsedGoldLease[] {
  return text
    .split(PAGE_BREAK_RE)
    .map(parseLeasePage)
    .filter((lease): lease is ParsedGoldLease => lease !== null);
}
