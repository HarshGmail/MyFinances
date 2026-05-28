// XIRR (extended internal rate of return) utility.
//
// IMPORTANT: portfolio-level (cross-asset) XIRR MUST be computed from the
// union of every individual dated buy/sell transaction across all asset
// classes plus a terminal current-value cash flow — never from aggregate
// `total_invested` figures, which collapse the time dimension and
// systematically understate returns when investments span many years.

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_IN_YEAR = 365.25;

export interface XirrTransaction {
  amount: number;
  when: Date;
}

export interface XirrOptions {
  guess?: number;
  [key: string]: any;
}

interface PreparedFlow {
  amount: number;
  years: number;
}

interface PreparedSeries {
  flows: PreparedFlow[];
  totalDeposited: number;
  totalReceived: number;
  spanYears: number;
}

function prepare(transactions: XirrTransaction[]): PreparedSeries {
  if (!transactions || transactions.length < 2) {
    throw new Error('Argument is not an array with length of 2 or more.');
  }

  let startDays = Math.floor(transactions[0].when.getTime() / MILLIS_PER_DAY);
  let endDays = startDays;
  let totalDeposited = 0;
  let totalReceived = 0;
  const epochDaysList: number[] = [];

  for (const tx of transactions) {
    const d = Math.floor(tx.when.getTime() / MILLIS_PER_DAY);
    epochDaysList.push(d);
    if (d < startDays) startDays = d;
    if (d > endDays) endDays = d;
    if (tx.amount < 0) totalDeposited += -tx.amount;
    else totalReceived += tx.amount;
  }

  if (startDays === endDays) {
    throw new Error('Transactions must not all be on the same day.');
  }
  if (totalDeposited === 0) {
    throw new Error('Transactions must include at least one negative (deposit).');
  }
  if (totalReceived === 0) {
    throw new Error('Transactions must include at least one positive (return).');
  }

  const flows: PreparedFlow[] = transactions.map((tx, i) => ({
    amount: tx.amount,
    years: (endDays - epochDaysList[i]) / DAYS_IN_YEAR,
  }));

  return {
    flows,
    totalDeposited,
    totalReceived,
    spanYears: (endDays - startDays) / DAYS_IN_YEAR,
  };
}

function npv(flows: PreparedFlow[], rate: number): number {
  // Defined only for rate > -1; caller must clamp.
  const base = 1 + rate;
  let sum = 0;
  for (const f of flows) {
    sum += f.amount * Math.pow(base, f.years);
  }
  return sum;
}

function dnpv(flows: PreparedFlow[], rate: number): number {
  const base = 1 + rate;
  let sum = 0;
  for (const f of flows) {
    if (f.years === 0) continue;
    sum += f.amount * f.years * Math.pow(base, f.years - 1);
  }
  return sum;
}

function newtonRaphson(flows: PreparedFlow[], guess: number): number | null {
  const tol = 1e-7;
  const maxIter = 50;
  let x = guess;
  for (let i = 0; i < maxIter; i++) {
    // Clamp to keep us inside the domain rate > -1 (slightly above -1 to avoid 0^Y issues).
    if (x <= -0.999999) x = -0.999999;
    const y = npv(flows, x);
    const yp = dnpv(flows, x);
    if (!isFinite(y) || !isFinite(yp) || Math.abs(yp) < 1e-12) return null;
    const next = x - y / yp;
    if (!isFinite(next)) return null;
    if (Math.abs(next - x) <= tol * Math.max(1, Math.abs(next))) {
      return Math.abs(npv(flows, next)) < 1e-3 * Math.max(1, Math.abs(next)) ? next : null;
    }
    x = next;
  }
  return null;
}

function bisection(flows: PreparedFlow[]): number | null {
  // Find a sign change in [-0.999999, 100] then bisect to find the root.
  let lo = -0.999999;
  let hi = 100;
  let yLo = npv(flows, lo);
  let yHi = npv(flows, hi);
  if (!isFinite(yLo) || !isFinite(yHi)) return null;
  if (yLo === 0) return lo;
  if (yHi === 0) return hi;
  if (yLo * yHi > 0) {
    // No sign change in the wide range — scan finely between -0.99 and 10 to look for any bracket.
    let prev = lo;
    let prevY = yLo;
    let found = false;
    for (let r = -0.99; r <= 10; r += 0.01) {
      const y = npv(flows, r);
      if (!isFinite(y)) continue;
      if (prevY * y <= 0) {
        lo = prev;
        hi = r;
        yLo = prevY;
        yHi = y;
        found = true;
        break;
      }
      prev = r;
      prevY = y;
    }
    if (!found) return null;
  }
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    const yMid = npv(flows, mid);
    if (!isFinite(yMid)) return null;
    if (Math.abs(yMid) < 1e-7 || hi - lo < 1e-9) return mid;
    if (yLo * yMid < 0) {
      hi = mid;
      yHi = yMid;
    } else {
      lo = mid;
      yLo = yMid;
    }
  }
  return 0.5 * (lo + hi);
}

export function xirr(transactions: XirrTransaction[], options?: XirrOptions): number {
  const prepared = prepare(transactions);
  const { flows, totalDeposited, totalReceived, spanYears } = prepared;

  // Construct a list of candidate initial guesses. The "natural" guess derived
  // from the cash-flow ratio is tried first, then a spread of common rates so
  // Newton-Raphson can find the right root for very-positive, mildly-positive,
  // and very-negative XIRRs (e.g. crypto drawdowns).
  const naturalGuess =
    spanYears > 0 ? Math.pow(totalReceived / totalDeposited, 1 / spanYears) - 1 : 0.1;
  const candidateGuesses: number[] = [];
  if (options?.guess !== undefined && !isNaN(options.guess)) candidateGuesses.push(options.guess);
  if (isFinite(naturalGuess)) candidateGuesses.push(naturalGuess);
  candidateGuesses.push(0.1, 0.5, 2.0, -0.5, 0.0, -0.2, -0.8, 1.0, 0.25);

  let best: { rate: number; residual: number } | null = null;
  for (const g of candidateGuesses) {
    const rate = newtonRaphson(flows, g);
    if (rate !== null && isFinite(rate) && rate > -1) {
      const residual = Math.abs(npv(flows, rate));
      if (!best || residual < best.residual) best = { rate, residual };
      // A clean root — done.
      if (residual < 1e-4) return rate;
    }
  }
  if (best && best.residual < 1) return best.rate;

  const bisected = bisection(flows);
  if (bisected !== null && isFinite(bisected) && bisected > -1) return bisected;

  if (best) return best.rate;
  throw new Error('XIRR failed to converge.');
}

export default xirr;
