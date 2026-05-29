// Mirror of frontend/src/utils/financialMonth.ts. A financial month ends on
// the last weekday of its calendar month; a date D belongs to FM(M) iff
// lastWorkingDay(M-1) <= D < lastWorkingDay(M).

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toMonthKey(year: number, month0: number): string {
  return `${year}-${pad2(month0 + 1)}`;
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

export function getCurrentFinancialMonthKey(): string {
  return getFinancialMonthKey(new Date());
}

export function getRecentFinancialMonthKeys(count: number): string[] {
  const keys: string[] = [];
  const current = getCurrentFinancialMonthKey();
  const [yStr, mStr] = current.split('-');
  let year = Number(yStr);
  let month0 = Number(mStr) - 1;
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
