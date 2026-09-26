import { differenceInDays, differenceInMonths } from 'date-fns';
import { FixedDeposit, RecurringDeposit } from '../types';

const DAYS_PER_YEAR = 365;
const MONTHS_PER_QUARTER = 3;
const PERCENT_TO_QUARTERLY_RATE = 400;
const PERCENT_TO_MONTHLY_RATE = 1200;
const PERCENT = 100;

export interface DepositSummary {
  invested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export function quarterlyCompoundInterest(
  principal: number,
  ratePercent: number,
  timeInMonths: number
): number {
  const quarters = Math.floor(timeInMonths / MONTHS_PER_QUARTER);
  const remainingMonths = timeInMonths % MONTHS_PER_QUARTER;
  let amount = principal * Math.pow(1 + ratePercent / PERCENT_TO_QUARTERLY_RATE, quarters);
  if (remainingMonths > 0) {
    amount = amount * (1 + (ratePercent / PERCENT_TO_MONTHLY_RATE) * remainingMonths);
  }
  return amount - principal;
}

export function simpleInterestAccrued(
  principal: number,
  ratePercent: number,
  daysElapsed: number
): number {
  return (principal * (ratePercent / PERCENT) * daysElapsed) / DAYS_PER_YEAR;
}

export function fixedDepositProgress(fd: FixedDeposit, now: Date = new Date()) {
  const created = new Date(fd.dateOfCreation);
  const totalDays = differenceInDays(new Date(fd.dateOfMaturity), created);
  const daysCompleted = Math.min(differenceInDays(now, created), totalDays);
  const currentInterest = simpleInterestAccrued(
    fd.amountInvested,
    fd.rateOfInterest,
    daysCompleted
  );
  return {
    totalDays,
    daysCompleted,
    currentInterest,
    currentValue: fd.amountInvested + currentInterest,
  };
}

export function recurringDepositProgress(rd: RecurringDeposit, now: Date = new Date()) {
  const created = new Date(rd.dateOfCreation);
  const totalMonths = differenceInMonths(new Date(rd.dateOfMaturity), created);
  const monthsCompleted = Math.min(differenceInMonths(now, created), totalMonths);
  const currentInterest = quarterlyCompoundInterest(
    rd.amountInvested,
    rd.rateOfInterest,
    monthsCompleted
  );
  return {
    totalMonths,
    monthsCompleted,
    currentInterest,
    currentValue: rd.amountInvested + currentInterest,
  };
}

function summarise(rows: { amountInvested: number; currentValue: number }[]): DepositSummary {
  const invested = rows.reduce((sum, row) => sum + row.amountInvested, 0);
  const currentValue = rows.reduce((sum, row) => sum + row.currentValue, 0);
  const profitLoss = currentValue - invested;
  return {
    invested,
    currentValue,
    profitLoss,
    profitLossPercentage: invested > 0 ? (profitLoss / invested) * PERCENT : 0,
  };
}

export function summariseFixedDeposits(fds: FixedDeposit[], now?: Date): DepositSummary {
  return summarise(
    fds.map((fd) => ({
      amountInvested: fd.amountInvested,
      currentValue: fixedDepositProgress(fd, now).currentValue,
    }))
  );
}

export function summariseRecurringDeposits(rds: RecurringDeposit[], now?: Date): DepositSummary {
  return summarise(
    rds.map((rd) => ({
      amountInvested: rd.amountInvested,
      currentValue: recurringDepositProgress(rd, now).currentValue,
    }))
  );
}
