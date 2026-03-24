export interface ParsedMFTransaction {
  date: Date;
  fundName: string;
  numOfUnits: number;
  fundPrice: number;
  amount: number;
  type: 'credit' | 'debit';
}

// Keywords that indicate a credit (purchase) transaction
const CREDIT_KEYWORDS = [
  'purchase',
  'systematic investment',
  'sip',
  'switch in',
  'dividend reinvestment',
  'nfo allotment',
];

// Keywords that indicate a debit (redemption) transaction
const DEBIT_KEYWORDS = ['redemption', 'switch out', 'withdrawal', 'repurchase'];

function isCredit(description: string): boolean {
  const lower = description.toLowerCase();
  if (DEBIT_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  if (CREDIT_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  return true; // default to credit if ambiguous
}

function parseDateDDMMYYYY(dateStr: string): Date {
  const [dd, mm, yyyy] = dateStr.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

/**
 * Strips scheme code prefix from fund names.
 * e.g. "489 - Franklin Build India Fund - Direct Plan - Growth"
 *   → "Franklin Build India Fund - Direct Plan - Growth"
 * e.g. "FMGD - Motilal Oswal Midcap Fund - Direct Plan Growth"
 *   → "Motilal Oswal Midcap Fund - Direct Plan Growth"
 */
function stripSchemeCode(line: string): string {
  return line.replace(/^[A-Z0-9]+\s*-\s*/, '').trim();
}

export function parseCdslMFTransactions(text: string): ParsedMFTransaction[] {
  const transactions: ParsedMFTransaction[] = [];

  // Find the MF transactions section
  const sectionStartIdx = text.indexOf('MUTUAL FUND UNITS HELD WITH MF/RTA');
  if (sectionStartIdx === -1) {
    console.log('[CDSL Parser] MF section not found in text');
    return transactions;
  }

  const sectionEndIdx = text.indexOf('MUTUAL FUND UNITS HELD AS ON', sectionStartIdx);
  const section =
    sectionEndIdx !== -1 ? text.slice(sectionStartIdx, sectionEndIdx) : text.slice(sectionStartIdx);

  const lines = section
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let currentFundName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip boilerplate / column headers
    if (
      line.includes('Transaction Description') ||
      line.includes('Stamp Duty') ||
      line.includes('Income Distribution') ||
      line.includes('Capital Withdrawal') ||
      line.includes('STATEMENT OF TRANSACTIONS') ||
      line.includes('MUTUAL FUND UNITS') ||
      line.startsWith('ISIN :') ||
      line.startsWith('तारीख') || // Hindi "Date"
      line.startsWith('लेनदेन') // Hindi "Transaction"
    ) {
      continue;
    }

    // Skip opening/closing balance lines
    if (/opening balance|closing balance/i.test(line)) continue;

    // Detect AMC name (does not contain " - " as a separator and isn't a transaction line)
    // AMC names are typically on their own line before the scheme code line
    // e.g. "Franklin Templeton Mutual Fund", "Motilal Oswal Mutual Fund"
    if (
      /mutual fund/i.test(line) &&
      !line.match(/^\d{2}-\d{2}-\d{4}/) &&
      !line.match(/^[A-Z0-9]+ - /)
    ) {
      // AMC name line — the next relevant line will be the scheme code line
      continue;
    }

    // Detect scheme code line: "489 - Franklin Build India Fund - Direct Plan - Growth"
    // Pattern: starts with alphanumeric code(s), then " - ", then fund name
    if (/^[A-Z0-9]+ - .+/i.test(line) && !line.startsWith('ISIN')) {
      currentFundName = stripSchemeCode(line);
      continue;
    }

    // Detect transaction row: starts with DD-MM-YYYY date
    const dateMatch = line.match(/^(\d{2}-\d{2}-\d{4})\s*(.*)/);
    if (dateMatch && currentFundName) {
      const dateStr = dateMatch[1];
      let restOfLine = dateMatch[2];

      // The description may span multiple lines before the numbers appear
      // Collect continuation lines until we find a line with numbers
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        // Stop if next line is another date, a balance line, or a scheme header
        if (
          /^\d{2}-\d{2}-\d{4}/.test(nextLine) ||
          /opening balance|closing balance/i.test(nextLine) ||
          /^[A-Z0-9]+ - /.test(nextLine)
        ) {
          break;
        }
        // Stop if this line looks like it contains the numeric data (amount NAV units)
        // A line with 3+ numbers separated by spaces is likely the data row
        if (/[\d,]+\.?\d*\s+[\d,]+\.?\d*\s+[\d,]+\.?\d*/.test(restOfLine)) {
          break;
        }
        i++;
        restOfLine += ' ' + nextLine;
      }

      // Extract: amount, NAV, price, units from restOfLine
      // Pattern based on actual PDF: "... description ... 3999.8 169.236 169.236 23.634 .2 0 0"
      // We want: amount (1st number), NAV (2nd number), price (3rd), units (4th)
      const numMatches = [...restOfLine.matchAll(/([\d,]+\.?\d*)/g)].map((m) =>
        parseFloat(m[1].replace(/,/g, ''))
      );

      // Filter out very small numbers that are likely stamp duty / 0 values
      // We need at least 4 meaningful numbers: amount, NAV, price, units
      const meaningfulNums = numMatches.filter((n) => n > 0);

      if (meaningfulNums.length >= 4) {
        const [amount, nav, , units] = meaningfulNums;
        const description = restOfLine;

        transactions.push({
          date: parseDateDDMMYYYY(dateStr),
          fundName: currentFundName,
          amount,
          fundPrice: nav,
          numOfUnits: units,
          type: isCredit(description) ? 'credit' : 'debit',
        });
      } else if (meaningfulNums.length === 3) {
        // Sometimes stamp duty etc. may not appear; try amount, NAV, units
        const [amount, nav, units] = meaningfulNums;
        transactions.push({
          date: parseDateDDMMYYYY(dateStr),
          fundName: currentFundName,
          amount,
          fundPrice: nav,
          numOfUnits: units,
          type: isCredit(restOfLine) ? 'credit' : 'debit',
        });
      }
    }
  }

  console.log(`[CDSL Parser] Extracted ${transactions.length} MF transactions`);
  return transactions;
}
