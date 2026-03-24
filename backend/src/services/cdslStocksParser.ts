export interface ParsedStockHolding {
  isin: string;
  companyName: string; // cleaned name from CDSL (used for Yahoo Finance search)
  numOfShares: number; // free balance
  marketPrice: number; // price as on statement date
  amount: number; // value (marketPrice × numOfShares)
  date: Date; // "AS ON" date from the holding statement
}

const ISIN_RE = /^(IN[A-Z0-9]{10})\s+(.*)/;
const HOLDING_DATE_RE = /HOLDING STATEMENT AS ON\s+(\d{2}-\d{2}-\d{4})/gi;

/**
 * Remove legal boilerplate from CDSL company name strings.
 *
 * Examples:
 *   "JAIPRAKASH ASSOCIATES LIMITED - NEW EQUITY SHARES OF RS. 2/- AFTER SPLIT"
 *     → "JAIPRAKASH ASSOCIATES LIMITED"
 *   "MSTC LIMITED # EQUITY SHARES"
 *     → "MSTC LIMITED"
 *   "3M INDIA LIMITED # EQUITY SHARES"
 *     → "3M INDIA LIMITED"
 */
function cleanCompanyName(raw: string): string {
  // Split on '#' — take the part before it (company name)
  let name = raw.split('#')[0];

  // Strip common legal share-class suffixes
  name = name.replace(/\s*-\s*(NEW\s+)?EQUITY SHARES?.*/i, '');
  name = name.replace(/\s*-\s*ORDINARY SHARES?.*/i, '');
  name = name.replace(/\s*-\s*RIGHT SHARES?.*/i, '');
  name = name.replace(/\s*-\s*PREFERENCE SHARES?.*/i, '');
  name = name.replace(/\s*-\s*BONUS SHARES?.*/i, '');
  name = name.replace(/\s*-\s*PARTLY PAID.*/i, '');

  return name.trim();
}

/**
 * Parse CDSL eCAS equity holdings from the "HOLDING STATEMENT AS ON DD-MM-YYYY" section.
 *
 * Each row looks like:
 *   INE255X01014 MSTC LIMITED # EQUITY SHARES  25.000  --  --  --  25.000  890.850  22,271.25
 *
 * Columns (after ISIN + name): CurrentBal | FrozenBal | PledgeBal | PledgeSetupBal | FreeBal | MarketPrice | Value
 * FrozenBal / PledgeBal / PledgeSetupBal are usually "--" (zero).
 *
 * Only INE ISINs (equity) are extracted. INF ISINs (MF/ETF) are skipped.
 */
export function parseCdslStockHoldings(text: string): ParsedStockHolding[] {
  const holdings: ParsedStockHolding[] = [];

  // Collect all holding-date sections (multiple DPs may appear in one CAS)
  const matches = [...text.matchAll(HOLDING_DATE_RE)];
  if (matches.length === 0) {
    console.log('[CDSL Stocks Parser] No "HOLDING STATEMENT AS ON" section found');
    return holdings;
  }

  // Use the last / most-recent holding statement in the PDF
  const lastMatch = matches[matches.length - 1];
  const [dd, mm, yyyy] = lastMatch[1].split('-').map(Number);
  const holdingDate = new Date(yyyy, mm - 1, dd);

  // Take section from the last match onwards
  const sectionStart = text.lastIndexOf(lastMatch[0]);
  const section = text.slice(sectionStart);

  const lines = section
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const isinMatch = line.match(ISIN_RE);
    if (!isinMatch) continue;

    const isin = isinMatch[1];

    // Skip INF ISINs — mutual funds / ETFs tracked separately
    if (isin.startsWith('INF')) continue;

    const rest = isinMatch[2];

    // Extract numeric values only (ignore "--" dashes)
    const nums = [...rest.matchAll(/(\d[\d,]*\.?\d*)/g)].map((m) =>
      parseFloat(m[1].replace(/,/g, ''))
    );

    // We need at least 3 numbers: freeBal, marketPrice, value
    if (nums.length < 3) continue;

    const freeBal = nums[nums.length - 3];
    const marketPrice = nums[nums.length - 2];
    const value = nums[nums.length - 1];

    // Skip zero / empty holdings
    if (freeBal <= 0 || marketPrice <= 0) continue;

    // Company name: text before the first 2+ whitespace-digit pattern
    const nameEndIdx = rest.search(/\s{2,}\d/);
    const rawName = nameEndIdx !== -1 ? rest.slice(0, nameEndIdx) : rest;
    const companyName = cleanCompanyName(rawName);

    if (!companyName) continue;

    holdings.push({
      isin,
      companyName,
      numOfShares: freeBal,
      marketPrice,
      amount: value,
      date: holdingDate,
    });
  }

  console.log(`[CDSL Stocks Parser] Extracted ${holdings.length} equity holdings`);
  return holdings;
}
