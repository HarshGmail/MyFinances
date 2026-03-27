export interface ParsedGoldTransaction {
  date: Date;
  goldPrice: number;
  quantity: number;
  amount: number;
  tax: number;
  type: 'credit' | 'debit';
  platform: string;
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

function parseOrdinalDate(dateStr: string): Date | null {
  const match = dateStr.match(ORDINAL_DATE_RE);
  if (!match) return null;
  const day = parseInt(match[1]);
  const month = MONTHS[match[2].toLowerCase()];
  const year = parseInt(match[3]);
  if (month === undefined) return null;
  return new Date(year, month, day);
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
    logger.info({ preview: text.slice(0, 300).replace(/\n/g, '|') }, '[SafeGold Parser] "Transaction Statement" not found in text');
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
  const blocks: { date: Date; text: string }[] = [];
  let currentDate: Date | null = null;
  let blockLines: string[] = [];

  const flush = () => {
    if (currentDate && blockLines.length > 0) {
      blocks.push({ date: currentDate, text: blockLines.join(' ') });
    }
  };

  for (const line of lines) {
    // Skip table header rows
    if (/date\s*&\s*time|transaction details|quantity|closing balance/i.test(line)) continue;

    const dateMatch = line.match(ORDINAL_DATE_RE);
    if (dateMatch) {
      const parsed = parseOrdinalDate(dateMatch[0]);
      if (parsed) {
        flush();
        currentDate = parsed;
        blockLines = [line];
        continue;
      }
    }

    if (currentDate) {
      blockLines.push(line);
    }
  }
  flush();

  logger.info({ count: blocks.length }, '[SafeGold Parser] Built transaction blocks');

  // Count how many blocks actually contain purchased/sold for debugging
  const purchaseBlocks = blocks.filter((b) => /purchased/i.test(b.text));
  const soldBlocks = blocks.filter((b) => /\bsold\b/i.test(b.text));
  logger.info({ purchased: purchaseBlocks.length, sold: soldBlocks.length }, "[SafeGold Parser] Blocks with 'Purchased' and 'Sold'");

  for (const block of blocks) {
    const t = block.text;

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
