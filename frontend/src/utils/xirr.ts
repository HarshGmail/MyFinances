// XIRR calculation utility (ported from JS to TS, ES module)
import newton from 'newton-raphson-method';

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_IN_YEAR = 365;

export interface XirrTransaction {
  amount: number;
  when: Date;
}

export interface XirrOptions {
  guess?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

function convert(data: XirrTransaction[]) {
  if (!data || !data.length || !data.forEach || data.length < 2) {
    throw new Error('Argument is not an array with length of 2 or more.');
  }

  const investments: { amount: number; epochDays: number; years?: number }[] = [];
  let start = Math.floor(data[0].when.getTime() / MILLIS_PER_DAY);
  let end = start;
  let minAmount = Number.POSITIVE_INFINITY;
  let maxAmount = Number.NEGATIVE_INFINITY;
  let total = 0;
  let deposits = 0;
  data.forEach(function (datum) {
    total += datum.amount;
    if (datum.amount < 0) {
      deposits += -datum.amount;
    }
    const epochDays = Math.floor(datum.when.getTime() / MILLIS_PER_DAY);
    start = Math.min(start, epochDays);
    end = Math.max(end, epochDays);
    minAmount = Math.min(minAmount, datum.amount);
    maxAmount = Math.max(maxAmount, datum.amount);
    investments.push({
      amount: datum.amount,
      epochDays: epochDays,
    });
  });
  if (start === end) {
    throw new Error('Transactions must not all be on the same day.');
  }
  if (minAmount >= 0) {
    throw new Error('Transactions must not all be nonnegative.');
  }
  if (maxAmount < 0) {
    throw new Error('Transactions must not all be negative.');
  }
  investments.forEach(function (investment) {
    // Number of years (including fraction) this item applies
    investment.years = (end - investment.epochDays) / DAYS_IN_YEAR;
  });
  return {
    total: total,
    deposits: deposits,
    days: end - start,
    investments: investments,
    maxAmount: maxAmount,
  };
}

export function xirr(transactions: XirrTransaction[], options?: XirrOptions): number {
  const data = convert(transactions);
  if (data.maxAmount === 0) {
    return -1;
  }
  const investments = data.investments;
  const value = function (rate: number) {
    return investments.reduce(function (sum, investment) {
      const A = investment.amount;
      const Y = investment.years!;
      if (-1 < rate) {
        return sum + A * Math.pow(1 + rate, Y);
      } else if (rate < -1) {
        return sum - Math.abs(A) * Math.pow(-1 - rate, Y);
      } else if (Y === 0) {
        return sum + A;
      } else {
        return sum;
      }
    }, 0);
  };
  const derivative = function (rate: number) {
    return investments.reduce(function (sum, investment) {
      const A = investment.amount;
      const Y = investment.years!;
      if (Y === 0) {
        return sum;
      } else if (-1 < rate) {
        return sum + A * Y * Math.pow(1 + rate, Y - 1);
      } else if (rate < -1) {
        return sum + Math.abs(A) * Y * Math.pow(-1 - rate, Y - 1);
      } else {
        return sum;
      }
    }, 0);
  };
  let guess = options ? options.guess : undefined;
  if (guess && isNaN(guess)) {
    throw new Error('option.guess must be a number.');
  }
  if (!guess) {
    guess = data.total / data.deposits / (data.days / DAYS_IN_YEAR);
  }
  const rate = newton(value, derivative, guess, options);
  if (rate === false) {
    throw new Error('Newton-Raphson algorithm failed to converge.');
  }
  return rate;
}

export default xirr;
