export const GOLD_CATEGORIES = ['purchase', 'sale', 'lease_interest', 'lease_tds'] as const;
export type GoldCategory = (typeof GOLD_CATEGORIES)[number];
export const LEASE_CATEGORIES: GoldCategory[] = ['lease_interest', 'lease_tds'];

export interface ParsedGoldTransaction {
  date: Date;
  goldPrice: number;
  quantity: number;
  amount: number;
  tax: number;
  type: 'credit' | 'debit';
  platform: string;
  category?: GoldCategory;
  borrower?: string;
  leasedGrams?: number;
}

export interface SafeGoldAccountSummary {
  asOf: Date;
  totalGold: number;
  availableGold: number;
  leasedGold: number;
}

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const ORDINAL_DATE_RE = /(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]+)\s+(\d{4})/i;
const ROW_START_RE = /^(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]+)\s+(\d{4})$/i;
const ROW_TIME_RE = /^(\d{1,2})\D?(\d{2})\D?(\d{2})\s*(AM|PM)$/i;
const PAGE_MARKER_RE = /^--\s*\d+\s+of\s+\d+\s*--$/;
const WALLET_BALANCE_HEADER_RE = /gold wallet balance as of/i;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const LEASE_INTEREST_RE =
  /lease rental payout amounting to\s+([\d.]+)\s+grams?\s+for leasing\s+([\d.]+)\s+grams?\s+of\s+24K\s+gold\s+to\s+(.+?)\s+on\s+\d{1,2}(?:st|nd|rd|th)\b/i;
const LEASE_TDS_RE = /([\d.]+)\s+grams?\s+deducted as TDS on yield earned from\s+(.+?)\s+leases\b/i;

function parseOrdinalDate(dateStr: string): Date | null {
  const match = dateStr.match(ORDINAL_DATE_RE);
  if (!match) return null;
  const day = parseInt(match[1]);
  const month = MONTHS[match[2].toLowerCase()];
  const year = parseInt(match[3]);
  if (month === undefined) return null;
  return new Date(year, month, day);
}

function parseIstRowTimestamp(date: Date, timeLine: string | undefined): Date {
  const match = timeLine?.match(ROW_TIME_RE);
  if (!match) return date;
  const hour12 = parseInt(match[1]) % 12;
  const hour = match[4].toUpperCase() === 'PM' ? hour12 + 12 : hour12;
  const utcMs =
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      parseInt(match[2]),
      parseInt(match[3])
    ) - IST_OFFSET_MS;
  return new Date(utcMs);
}

function parseGrams(pattern: RegExp, text: string): number | null {
  const match = text.match(pattern);
  return match ? parseFloat(match[1]) : null;
}

export function parseSafeGoldAccountSummary(text: string): SafeGoldAccountSummary | null {
  const asOfMatch = text.match(/As of\s+(\d{1,2}(?:st|nd|rd|th)\s+[A-Za-z]+\s+\d{4})/i);
  const asOf = asOfMatch ? parseOrdinalDate(asOfMatch[1]) : null;
  const totalGold = parseGrams(/Total Gold\s+([\d.]+)\s*g/i, text);
  const availableGold = parseGrams(/Available Gold Balance\s+([\d.]+)\s*g/i, text);
  const leasedGold = parseGrams(/Gold on Lease\s+([\d.]+)\s*g/i, text);

  if (!asOf || totalGold === null || availableGold === null || leasedGold === null) return null;
  return { asOf, totalGold, availableGold, leasedGold };
}

function parseLeaseRow(timestamp: Date, text: string): ParsedGoldTransaction | null {
  const interest = text.match(LEASE_INTEREST_RE);
  if (interest) {
    return {
      date: timestamp,
      quantity: parseFloat(interest[1]),
      leasedGrams: parseFloat(interest[2]),
      borrower: interest[3].trim(),
      amount: 0,
      goldPrice: 0,
      tax: 0,
      type: 'credit',
      category: 'lease_interest',
      platform: 'SafeGold',
    };
  }

  const tds = text.match(LEASE_TDS_RE);
  if (tds) {
    return {
      date: timestamp,
      quantity: parseFloat(tds[1]),
      borrower: tds[2].trim(),
      amount: 0,
      goldPrice: 0,
      tax: 0,
      type: 'debit',
      category: 'lease_tds',
      platform: 'SafeGold',
    };
  }

  return null;
}

/** Skip rows that are not actual buy/sell events */
function isSkippable(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('lease rental') ||
    lower.includes('deducted as tds') ||
    lower.includes('tds on') ||
    lower.includes('leased ') ||
    lower.includes('lease income') ||
    lower.includes('opening gold wallet') ||
    lower.includes('closing gold wallet')
  );
}

/** Parse a number that may be prefixed by ₹ or Rs. or nothing */
function parseCurrencyNum(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

import logger from '../utils/logger';

export function parseSafeGoldTransactions(text: string): ParsedGoldTransaction[] {
  const transactions: ParsedGoldTransaction[] = [];

  // Find the transaction statement section (case-insensitive)
  const idx = text.search(/transaction statement/i);
  if (idx === -1) {
    logger.info(
      { preview: text.slice(0, 300).replace(/\n/g, '|') },
      '[SafeGold Parser] "Transaction Statement" not found in text'
    );
    return transactions;
  }

  const section = text.slice(idx);
  const lines = section
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Build transaction blocks: each block = all lines belonging to one transaction row.
  // A new block starts when we see an ordinal date line (e.g. "1st February 2026").
  // We accumulate subsequent lines (description, quantity, closing balance) into the block.
  const blocks: { date: Date; timestamp: Date; text: string }[] = [];
  let currentDate: Date | null = null;
  let blockLines: string[] = [];

  const flush = () => {
    if (currentDate && blockLines.length > 0) {
      blocks.push({
        date: currentDate,
        timestamp: parseIstRowTimestamp(currentDate, blockLines[1]),
        text: blockLines.join(' '),
      });
    }
  };

  const rowsCarryTimestamps = lines.some((line) => ROW_TIME_RE.test(line));
  const startsRow = (line: string, nextLine: string | undefined) =>
    rowsCarryTimestamps
      ? ROW_START_RE.test(line) && ROW_TIME_RE.test(nextLine ?? '')
      : ORDINAL_DATE_RE.test(line);

  lines.forEach((line, index) => {
    if (PAGE_MARKER_RE.test(line)) return;

    if (WALLET_BALANCE_HEADER_RE.test(line)) {
      flush();
      currentDate = null;
      blockLines = [];
      return;
    }

    if (/date\s*&\s*time|transaction details|quantity|closing balance/i.test(line)) return;

    if (startsRow(line, lines[index + 1])) {
      const parsed = parseOrdinalDate(line);
      if (parsed) {
        flush();
        currentDate = parsed;
        blockLines = [line];
        return;
      }
    }

    if (currentDate) {
      blockLines.push(line);
    }
  });
  flush();

  logger.info({ count: blocks.length }, '[SafeGold Parser] Built transaction blocks');

  // Count how many blocks actually contain purchased/sold for debugging
  const purchaseBlocks = blocks.filter((b) => /purchased/i.test(b.text));
  const soldBlocks = blocks.filter((b) => /\bsold\b/i.test(b.text));
  logger.info(
    { purchased: purchaseBlocks.length, sold: soldBlocks.length },
    "[SafeGold Parser] Blocks with 'Purchased' and 'Sold'"
  );

  for (const block of blocks) {
    const t = block.text;

    const leaseRow = parseLeaseRow(block.timestamp, t);
    if (leaseRow) {
      transactions.push(leaseRow);
      continue;
    }

    if (isSkippable(t)) continue;

    const lower = t.toLowerCase();

    // ── Purchase ──────────────────────────────────────────────────────────────
    if (lower.includes('purchased')) {
      // "Purchased 2.1694 grams of 24K gold for ₹35000.0 at ₹15662.91/g Incl. GST of ₹1019.42"
      // Currency symbol may be ₹, Rs., Rs or absent
      const CURRENCY = '(?:(?:Rs\\.?|₹)\\s*)?';

      const qtyMatch = t.match(/Purchased\s+([\d.]+)\s+grams?/i);
      const amtMatch = t.match(new RegExp(`for\\s+${CURRENCY}([\\d,]+\\.?\\d*)`, 'i'));
      const rateMatch = t.match(new RegExp(`at\\s+${CURRENCY}([\\d,]+\\.?\\d*)\\s*/\\s*g`, 'i'));
      const gstMatch = t.match(new RegExp(`GST\\s+of\\s+${CURRENCY}([\\d,]+\\.?\\d*)`, 'i'));

      if (qtyMatch && amtMatch && rateMatch) {
        transactions.push({
          date: block.date,
          quantity: parseFloat(qtyMatch[1]),
          amount: parseCurrencyNum(amtMatch[1]),
          goldPrice: parseCurrencyNum(rateMatch[1]),
          tax: gstMatch ? parseCurrencyNum(gstMatch[1]) : 0,
          type: 'credit',
          platform: 'SafeGold',
        });
      } else {
        logger.info({ block: t.slice(0, 120) }, '[SafeGold Parser] Could not parse purchase block');
      }
      continue;
    }

    // ── Sale ──────────────────────────────────────────────────────────────────
    if (/\bsold\b/i.test(t)) {
      const CURRENCY = '(?:(?:Rs\\.?|₹)\\s*)?';

      const qtyMatch = t.match(/Sold\s+([\d.]+)\s+grams?/i);
      const amtMatch = t.match(new RegExp(`for\\s+${CURRENCY}([\\d,]+\\.?\\d*)`, 'i'));
      const rateMatch = t.match(new RegExp(`at\\s+${CURRENCY}([\\d,]+\\.?\\d*)\\s*/\\s*g`, 'i'));

      if (qtyMatch && amtMatch && rateMatch) {
        transactions.push({
          date: block.date,
          quantity: parseFloat(qtyMatch[1]),
          amount: parseCurrencyNum(amtMatch[1]),
          goldPrice: parseCurrencyNum(rateMatch[1]),
          tax: 0,
          type: 'debit',
          platform: 'SafeGold',
        });
      } else {
        logger.info({ block: t.slice(0, 120) }, '[SafeGold Parser] Could not parse sale block');
      }
    }
  }

  logger.info({ count: transactions.length }, '[SafeGold Parser] Extracted gold transactions');
  return transactions;
}
