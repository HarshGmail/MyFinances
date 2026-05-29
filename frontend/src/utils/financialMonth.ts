// A "financial month" ends on the user's salary credit date (last working day of
// the calendar month) and starts at the previous month's salary credit. A date
// D belongs to FM(M) iff lastWorkingDay(M-1) <= D < lastWorkingDay(M).
//
// FM(M) is funded by the paycheck of (M-1) — the one that credits at the start
// of FM(M). Callers that need to look up paymentHistory/salaryHistory should
// use getSalaryMonthForFinancialMonth.

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toMonthKey(year: number, month0: number): string {
  return `${year}-${pad2(month0 + 1)}`;
}

function parseMonthKey(monthKey: string): { year: number; month0: number } {
  const [y, m] = monthKey.split('-').map(Number);
  return { year: y, month0: m - 1 };
}

export function getLastWorkingDay(year: number, month0: number): Date {
  const d = new Date(year, month0 + 1, 0);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getFinancialMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m0 = date.getMonth();
  const thisMonthLwd = getLastWorkingDay(y, m0);
  if (date < thisMonthLwd) {
    return toMonthKey(y, m0);
  }
  const next = new Date(y, m0 + 1, 1);
  return toMonthKey(next.getFullYear(), next.getMonth());
}

export function getFinancialMonthBoundaries(monthKey: string): {
  start: Date;
  end: Date;
} {
  const { year, month0 } = parseMonthKey(monthKey);
  const start = getLastWorkingDay(month0 === 0 ? year - 1 : year, month0 === 0 ? 11 : month0 - 1);
  const end = new Date(getLastWorkingDay(year, month0).getTime() - 1);
  return { start, end };
}

export function getSalaryMonthForFinancialMonth(monthKey: string): string {
  const { year, month0 } = parseMonthKey(monthKey);
  return month0 === 0 ? toMonthKey(year - 1, 11) : toMonthKey(year, month0 - 1);
}

export function getCurrentFinancialMonthKey(): string {
  return getFinancialMonthKey(new Date());
}

export function getRecentFinancialMonthKeys(count: number): string[] {
  const keys: string[] = [];
  let { year, month0 } = parseMonthKey(getCurrentFinancialMonthKey());
  for (let i = 0; i < count; i++) {
    keys.push(toMonthKey(year, month0));
    if (month0 === 0) {
      year -= 1;
      month0 = 11;
    } else {
      month0 -= 1;
    }
  }
  return keys.reverse();
}

export function financialMonthKeyToLabelDate(monthKey: string): Date {
  const { year, month0 } = parseMonthKey(monthKey);
  return new Date(year, month0, 1);
}
