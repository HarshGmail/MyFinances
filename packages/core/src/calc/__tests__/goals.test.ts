import { describe, expect, it } from 'vitest';
import { computeGoalProgress } from '../goals';
import { MutualFundInfo, UserGoal } from '../../types';

describe('goal progress', () => {
  it('sums linked holdings at current value, including allotted gold', () => {
    const goal: UserGoal = {
      userId: 'u',
      goalName: 'House',
      targetAmount: 1000000,
      stockSymbols: ['INFY', 'UNKNOWN'],
      mutualFundIds: ['mf1'],
      cryptoCurrency: ['Bitcoin'],
      goldAlloted: 10,
    };
    const progress = computeGoalProgress(
      goal,
      {
        stockValueByName: { INFY: 100000 },
        fundValueByName: { 'Parag Parikh Flexi Cap': 200000 },
        coinValueByName: { Bitcoin: 50000 },
        goldRatePerGram: 10000,
      },
      [{ _id: 'mf1', fundName: 'Parag Parikh Flexi Cap', schemeNumber: 1 } as MutualFundInfo]
    );
    expect(progress.breakdown).toEqual({
      stocks: 100000,
      mutualFunds: 200000,
      crypto: 50000,
      gold: 100000,
    });
    expect(progress.currentValue).toBe(450000);
    expect(progress.remainingAmount).toBe(550000);
    expect(progress.progressPercentage).toBeCloseTo(45, 6);
  });

  it('handles a goal with no target', () => {
    const progress = computeGoalProgress(
      { userId: 'u', goalName: 'x' },
      { stockValueByName: {}, fundValueByName: {}, coinValueByName: {}, goldRatePerGram: 0 },
      []
    );
    expect(progress.progressPercentage).toBe(0);
  });
});
