import { MutualFundInfo, UserGoal } from '../types';

const PERCENT = 100;

export interface GoalHoldingValues {
  stockValueByName: Record<string, number>;
  fundValueByName: Record<string, number>;
  coinValueByName: Record<string, number>;
  goldRatePerGram: number;
}

export interface GoalProgress {
  goal: UserGoal;
  currentValue: number;
  targetAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  breakdown: { stocks: number; mutualFunds: number; crypto: number; gold: number };
}

function sumValues(names: string[] | undefined, valueByName: Record<string, number>): number {
  return (names ?? []).reduce((sum, name) => sum + (valueByName[name] ?? 0), 0);
}

export function computeGoalProgress(
  goal: UserGoal,
  holdings: GoalHoldingValues,
  mfInfo: MutualFundInfo[]
): GoalProgress {
  const fundNames = (goal.mutualFundIds ?? [])
    .map((fundId) => mfInfo.find((info) => info._id === fundId)?.fundName)
    .filter((name): name is string => Boolean(name));

  const breakdown = {
    stocks: sumValues(goal.stockSymbols, holdings.stockValueByName),
    mutualFunds: sumValues(fundNames, holdings.fundValueByName),
    crypto: sumValues(goal.cryptoCurrency, holdings.coinValueByName),
    gold: (goal.goldAlloted ?? 0) * holdings.goldRatePerGram,
  };
  const currentValue = breakdown.stocks + breakdown.mutualFunds + breakdown.crypto + breakdown.gold;
  const targetAmount = goal.targetAmount ?? 0;

  return {
    goal,
    currentValue,
    targetAmount,
    remainingAmount: Math.max(0, targetAmount - currentValue),
    progressPercentage: targetAmount > 0 ? (currentValue / targetAmount) * PERCENT : 0,
    breakdown,
  };
}
