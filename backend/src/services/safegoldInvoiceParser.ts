import { ParsedGoldTransaction } from './safegoldParser';

/**
 * Parse a SafeGold real-time transaction invoice PDF (sent from noreply@safegold.in).
 *
 * Example PDF text (purchase):
 *   Date : 19-01-2026
 *   24K Gold
 *   HSN Code : 71081300  1.3178  ₹ 14734.13  ₹ 19417.48
 *   Applied Tax (1.5% CGST + 1.5% SGST)  ₹ 582.52
 *   Total Invoice Value  ₹ 20000.00
 *
 * Currently only purchase invoices ("Tax Invoice") are emailed. Sale confirmations
 * may use a different template — if this function returns null the PDF is skipped gracefully.
 */
export function parseSafeGoldInvoice(text: string): ParsedGoldTransaction | null {
  // Must be a SafeGold Tax Invoice (purchase)
  if (!/tax invoice/i.test(text)) {
    console.log('[SafeGold Invoice Parser] Not a Tax Invoice — skipping');
    return null;
  }

  // ── Date ─────────────────────────────────────────────────────────────────
  // "Date :\n19-01-2026"  or  "Date : 19-01-2026"
  const dateMatch = text.match(/Date\s*:[\s\n]*(\d{2}-\d{2}-\d{4})/i);
  if (!dateMatch) {
    console.log('[SafeGold Invoice Parser] Date not found');
    return null;
  }
  const [dd, mm, yyyy] = dateMatch[1].split('-').map(Number);
  const date = new Date(yyyy, mm - 1, dd);

  // ── Grams + Rate per Gram ─────────────────────────────────────────────────
  // The table row after "HSN Code : 71081300" contains:
  //   <grams>  ₹ <rate>  ₹ <netAmount>
  // Extract all numbers from the HSN Code line (grams and prices)
  const hsnMatch = text.match(
    /HSN\s*Code\s*:\s*\d+\s+([\s\S]{0,80}?)(?:Applied Tax|Total Invoice)/i
  );

  let quantity = 0;
  let goldPrice = 0;

  if (hsnMatch) {
    const nums = [...hsnMatch[1].matchAll(/[\d,]+\.?\d*/g)].map((m) =>
      parseFloat(m[0].replace(/,/g, ''))
    );
    // nums should be: [grams, ratePerGram, netAmount]
    if (nums.length >= 2) {
      quantity = nums[0];
      goldPrice = nums[1];
    }
  }

  if (!quantity || !goldPrice) {
    console.log('[SafeGold Invoice Parser] Could not parse grams / rate');
    return null;
  }

  // ── Total Invoice Value ───────────────────────────────────────────────────
  const totalMatch = text.match(/Total Invoice Value[\s\S]{0,30}?[₹Rs.]+\s*([\d,]+\.?\d*)/i);
  if (!totalMatch) {
    console.log('[SafeGold Invoice Parser] Total Invoice Value not found');
    return null;
  }
  const amount = parseFloat(totalMatch[1].replace(/,/g, ''));

  if (!amount) return null;

  // GST = 3% of net gold amount. Since total = net × 1.03: GST = total × 3/103
  const tax = parseFloat(((amount * 3) / 103).toFixed(2));

  console.log(
    `[SafeGold Invoice Parser] Parsed: ${quantity}g @ ₹${goldPrice}/g, total ₹${amount}, GST ₹${tax}`
  );

  return {
    date,
    goldPrice,
    quantity,
    amount,
    tax,
    type: 'credit',
    platform: 'SafeGold',
  };
}
