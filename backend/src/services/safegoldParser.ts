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

/** Parse "3rd February 2026" → Date */
function parseOrdinalDate(dateStr: string): Date | null {
  // Match: "3rd February 2026" or "1st January 2025" etc.
  const match = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]+)\s+(\d{4})/i);
  if (!match) return null;
  const day = parseInt(match[1]);
  const month = MONTHS[match[2].toLowerCase()];
  const year = parseInt(match[3]);
  if (month === undefined) return null;
  return new Date(year, month, day);
}

export function parseSafeGoldTransactions(text: string): ParsedGoldTransaction[] {
  const transactions: ParsedGoldTransaction[] = [];

  // Find the transaction statement section
  const sectionIdx = text.indexOf('Transaction Statement');
  if (sectionIdx === -1) {
    console.log('[SafeGold Parser] Transaction Statement section not found');
    return transactions;
  }

  const section = text.slice(sectionIdx);
  const lines = section
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let currentDate: Date | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect date lines: "3rd February 2026 06:06:01 PM" or just "3rd February 2026"
    const dateMatch = line.match(/(\d{1,2}(?:st|nd|rd|th)\s+[A-Za-z]+\s+\d{4})/i);
    if (dateMatch) {
      const parsed = parseOrdinalDate(dateMatch[1]);
      if (parsed) currentDate = parsed;
    }

    // Detect purchase: "Purchased X grams of 24K gold for ₹TOTAL at ₹RATE/g Incl. GST of ₹GST"
    // Also handle "₹" which may appear as "Rs." or just a number after currency symbol
    const purchaseMatch = line.match(
      /Purchased\s+([\d.]+)\s+grams?\s+of\s+24K\s+gold\s+for\s+[₹Rs.]*([\d,]+\.?\d*)\s+at\s+[₹Rs.]*([\d,]+\.?\d*)\/g\s+Incl\.\s+GST\s+of\s+[₹Rs.]*([\d,]+\.?\d*)/i
    );

    if (purchaseMatch && currentDate) {
      const quantity = parseFloat(purchaseMatch[1]);
      const amount = parseFloat(purchaseMatch[2].replace(/,/g, ''));
      const goldPrice = parseFloat(purchaseMatch[3].replace(/,/g, ''));
      const tax = parseFloat(purchaseMatch[4].replace(/,/g, ''));

      transactions.push({
        date: currentDate,
        goldPrice,
        quantity,
        amount,
        tax,
        type: 'credit',
        platform: 'SafeGold',
      });
      continue;
    }

    // Detect sale: "Sold X grams of 24K gold for ₹TOTAL at ₹RATE/g"
    const saleMatch = line.match(
      /Sold\s+([\d.]+)\s+grams?\s+of\s+24K\s+gold\s+for\s+[₹Rs.]*([\d,]+\.?\d*)\s+at\s+[₹Rs.]*([\d,]+\.?\d*)\/g/i
    );

    if (saleMatch && currentDate) {
      const quantity = parseFloat(saleMatch[1]);
      const amount = parseFloat(saleMatch[2].replace(/,/g, ''));
      const goldPrice = parseFloat(saleMatch[3].replace(/,/g, ''));

      transactions.push({
        date: currentDate,
        goldPrice,
        quantity,
        amount,
        tax: 0,
        type: 'debit',
        platform: 'SafeGold',
      });
    }

    // Skip all other transaction types (lease, TDS, rental)
  }

  console.log(`[SafeGold Parser] Extracted ${transactions.length} gold transactions`);
  return transactions;
}
