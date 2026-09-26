// CAGR (compound annual growth rate).
//
// CAGR collapses an investment to a single principal placed once on a start
// date and left untouched until an end date — it ignores the timing of any
// intermediate buys, sells, or contributions. For portfolios with cash flows
// spread across multiple dates, XIRR (utils/xirr.ts) is the correct measure.
//
// We expose CAGR as a "naive" reference shown alongside XIRR: it answers
// "what equivalent flat annual return would carry my net invested principal
// from the date I first deployed it to today's market value" — useful
// intuition, but not the true money-weighted return.

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_IN_YEAR = 365.25;
// Below ~14 days the exponent 1/years explodes any fractional gain or loss
// into nonsense; better to surface no number than a misleading one.
const MIN_YEARS = 14 / DAYS_IN_YEAR;

export interface CagrInput {
  netInvested: number;
  currentValue: number;
  startDate: Date;
  asOf?: Date;
}

export function cagr(input: CagrInput): number | null {
  const { netInvested, currentValue, startDate, asOf = new Date() } = input;
  if (!isFinite(netInvested) || netInvested <= 0) return null;
  if (!isFinite(currentValue) || currentValue <= 0) return null;
  const days = (asOf.getTime() - startDate.getTime()) / MILLIS_PER_DAY;
  const years = days / DAYS_IN_YEAR;
  if (!isFinite(years) || years < MIN_YEARS) return null;
  return Math.pow(currentValue / netInvested, 1 / years) - 1;
}

export function firstTransactionDate(
  txns: ReadonlyArray<{ date: string | Date }> | undefined | null
): Date | null {
  if (!txns || txns.length === 0) return null;
  let minMs = Number.POSITIVE_INFINITY;
  for (const tx of txns) {
    const t = tx.date instanceof Date ? tx.date.getTime() : new Date(tx.date).getTime();
    if (isFinite(t) && t < minMs) minMs = t;
  }
  return isFinite(minMs) ? new Date(minMs) : null;
}

export function earliestDate(dates: ReadonlyArray<Date | null | undefined>): Date | null {
  let minMs = Number.POSITIVE_INFINITY;
  for (const d of dates) {
    if (!d) continue;
    const t = d.getTime();
    if (isFinite(t) && t < minMs) minMs = t;
  }
  return isFinite(minMs) ? new Date(minMs) : null;
}

export default cagr;
