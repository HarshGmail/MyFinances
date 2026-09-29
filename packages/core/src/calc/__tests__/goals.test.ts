import { describe, expect, it } from 'vitest';
import {
  allocatedPercentByHolding,
  blendedExpectedReturn,
  buildGoalView,
  buildGoldHolding,
  buildRecurringDepositHoldings,
  computeGoalValue,
  cumulativeSeries,
  freePercent,
  futureValue,
  GoalHolding,
  goalStatus,
  holdingKey,
  indexHoldings,
  inflatedTarget,
  isOverAllocated,
  requiredMonthly,
  scaledCashFlows,
  trailingMonthlyContribution,
} from '../goals';
import { GoldTransaction, RecurringDeposit, UserGoal } from '../../types';

const NOW = new Date('2026-01-01T00:00:00Z');

function holding(overrides: Partial<GoalHolding> & Pick<GoalHolding, 'assetType' | 'assetKey'>) {
  return {
    label: overrides.assetKey,
    currentValue: 0,
    invested: 0,
    cashFlows: [],
    ratePct: null,
    xirrPct: null,
    firstInvestedAt: null,
    ...overrides,
  } as GoalHolding;
}

function goal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    _id: 'g1',
    userId: 'u1',
    goalName: 'House',
    targetAmount: 1000000,
    targetDate: '2031-01-01T00:00:00Z',
    allocations: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const flexiCap = holding({
  assetType: 'mutualFund',
  assetKey: 'Flexi Cap',
  currentValue: 200000,
  invested: 150000,
  cashFlows: [
    { date: new Date('2024-01-01'), amount: 100000 },
    { date: new Date('2025-06-01'), amount: 50000 },
  ],
  xirrPct: 18,
  firstInvestedAt: new Date('2024-01-01'),
});
const infy = holding({
  assetType: 'stock',
  assetKey: 'INFY',
  currentValue: 100000,
  invested: 80000,
  cashFlows: [{ date: new Date('2025-09-01'), amount: 80000 }],
  xirrPct: 40,
  firstInvestedAt: new Date('2025-09-01'),
});
const fd = holding({
  assetType: 'fd',
  assetKey: 'fd1',
  currentValue: 105000,
  invested: 100000,
  cashFlows: [{ date: new Date('2025-01-01'), amount: 100000 }],
  ratePct: 7.5,
  firstInvestedAt: new Date('2025-01-01'),
});
const holdingsByKey = indexHoldings([flexiCap, infy, fd]);

describe('goal value', () => {
  it('scales each linked holding by its allocation and groups by asset type', () => {
    const value = computeGoalValue(
      {
        manualAmount: 25000,
        allocations: [
          { assetType: 'mutualFund', assetKey: 'Flexi Cap', percent: 50 },
          { assetType: 'stock', assetKey: 'INFY', percent: 100 },
          { assetType: 'fd', assetKey: 'fd1', percent: 20 },
          { assetType: 'stock', assetKey: 'SOLD', percent: 100 },
        ],
      },
      holdingsByKey
    );
    expect(value.byType.mutualFund).toBe(100000);
    expect(value.byType.stock).toBe(100000);
    expect(value.byType.fd).toBe(21000);
    expect(value.byType.manual).toBe(25000);
    expect(value.currentValue).toBe(246000);
    expect(value.invested).toBe(75000 + 80000 + 20000 + 25000);
    expect(value.lines[3].holding).toBeNull();
    expect(value.lines[3].value).toBe(0);
  });
});

describe('expected return', () => {
  it('uses the deposit rate, own history after a year, and the class default for young holdings', () => {
    const value = computeGoalValue(
      {
        allocations: [
          { assetType: 'mutualFund', assetKey: 'Flexi Cap', percent: 50 },
          { assetType: 'stock', assetKey: 'INFY', percent: 100 },
          { assetType: 'fd', assetKey: 'fd1', percent: 100 },
        ],
      },
      holdingsByKey
    );
    const blended = blendedExpectedReturn(value, NOW);
    const byLabel = Object.fromEntries(blended.sources.map((source) => [source.label, source]));
    expect(byLabel['Flexi Cap']).toMatchObject({ pct: 18, basis: 'history' });
    expect(byLabel.INFY).toMatchObject({ pct: 12, basis: 'default' });
    expect(byLabel.fd1).toMatchObject({ pct: 7.5, basis: 'rate' });
    const expected = (100000 * 18 + 100000 * 12 + 105000 * 7.5) / 305000;
    expect(blended.pct).toBeCloseTo(expected, 6);
  });

  it('clamps an outlier history return', () => {
    const hot = holding({
      assetType: 'crypto',
      assetKey: 'Bitcoin',
      currentValue: 1000,
      xirrPct: 140,
      firstInvestedAt: new Date('2023-01-01'),
    });
    const value = computeGoalValue(
      { allocations: [{ assetType: 'crypto', assetKey: 'Bitcoin', percent: 100 }] },
      indexHoldings([hot])
    );
    expect(blendedExpectedReturn(value, NOW).pct).toBe(25);
  });
});

describe('time value maths', () => {
  it('computes the monthly amount that reaches the target at the expected return', () => {
    const monthly = requiredMonthly(100000, 1000000, 60, 12);
    expect(futureValue(100000, monthly, 60, 12)).toBeCloseTo(1000000, 4);
  });

  it('falls back to straight division at zero return', () => {
    expect(requiredMonthly(100000, 700000, 60, 0)).toBe(10000);
    expect(futureValue(100000, 10000, 60, 0)).toBe(700000);
  });

  it('needs nothing more once the target is met, and the full gap when time is up', () => {
    expect(requiredMonthly(1200000, 1000000, 60, 12)).toBe(0);
    expect(requiredMonthly(400000, 1000000, 0, 12)).toBe(600000);
  });

  it('grows a target by compounded inflation', () => {
    const target = inflatedTarget(1000000, 6, new Date('2031-01-01T00:00:00Z'), NOW);
    expect(target).toBeCloseTo(1000000 * Math.pow(1.06, 1826 / 365), 0);
  });
});

describe('contributions and history', () => {
  it('scales cash flows by allocation and builds a cumulative series', () => {
    const value = computeGoalValue(
      { allocations: [{ assetType: 'mutualFund', assetKey: 'Flexi Cap', percent: 50 }] },
      holdingsByKey
    );
    const series = cumulativeSeries(scaledCashFlows(value.lines));
    expect(series.map((point) => point.value)).toEqual([50000, 75000]);
  });

  it('averages the last twelve months of net contributions', () => {
    const flows = [
      { date: new Date('2024-06-01'), amount: 500000 },
      { date: new Date('2025-03-01'), amount: 60000 },
      { date: new Date('2025-09-01'), amount: 84000 },
      { date: new Date('2025-10-01'), amount: -24000 },
    ];
    expect(trailingMonthlyContribution(flows, NOW)).toBe(10000);
  });

  it('excludes lease rows from gold cash flows', () => {
    const tx = (overrides: Partial<GoldTransaction>) =>
      ({
        id: 'x',
        type: 'credit',
        date: '2025-01-01',
        goldPrice: 7000,
        quantity: 1,
        amount: 7000,
        tax: 0,
        ...overrides,
      }) as GoldTransaction;
    const gold = buildGoldHolding(
      [tx({}), tx({ category: 'lease_interest', quantity: 0.05, amount: 0 })],
      8000,
      NOW
    );
    expect(gold?.cashFlows).toHaveLength(1);
    expect(gold?.currentValue).toBeCloseTo(1.05 * 8000, 6);
    expect(gold?.invested).toBe(7000);
  });

  it('spreads recurring deposit contributions monthly up to the amount invested', () => {
    const rd = {
      _id: 'rd1',
      userId: 'u1',
      recurringDepositName: 'RD',
      dateOfCreation: new Date('2025-07-01'),
      dateOfMaturity: new Date('2026-07-01'),
      amountInvested: 30000,
      monthlyDeposit: 5000,
      rateOfInterest: 7,
    } as RecurringDeposit;
    const [built] = buildRecurringDepositHoldings([rd], NOW);
    expect(built.cashFlows.map((flow) => flow.amount)).toEqual(Array(6).fill(5000));
  });
});

describe('status and allocation headroom', () => {
  it('classifies by projection against target', () => {
    expect(goalStatus(1000, 1000, 1000)).toBe('achieved');
    expect(goalStatus(500, 1000, 1000)).toBe('on-track');
    expect(goalStatus(500, 950, 1000)).toBe('slightly-behind');
    expect(goalStatus(500, 800, 1000)).toBe('behind');
  });

  it('sums allocations across other goals and reports what is free', () => {
    const goals = [
      goal({ _id: 'a', allocations: [{ assetType: 'stock', assetKey: 'INFY', percent: 60 }] }),
      goal({ _id: 'b', allocations: [{ assetType: 'stock', assetKey: 'INFY', percent: 30 }] }),
    ];
    const key = holdingKey('stock', 'INFY');
    expect(freePercent(allocatedPercentByHolding(goals), key)).toBe(10);
    expect(freePercent(allocatedPercentByHolding(goals, 'b'), key)).toBe(40);
    expect(isOverAllocated(40, 40)).toBe(false);
    expect(isOverAllocated(40.5, 40)).toBe(true);
  });
});

describe('goal view', () => {
  it('projects with the planned monthly and inflates the target when asked', () => {
    const view = buildGoalView(
      goal({
        inflationAdjusted: true,
        plannedMonthly: 20000,
        expectedReturnPct: 10,
        allocations: [{ assetType: 'mutualFund', assetKey: 'Flexi Cap', percent: 100 }],
      }),
      { holdingsByKey, inflationPct: 5, now: NOW }
    );
    expect(view.monthsLeft).toBe(60);
    expect(view.targetInTodaysMoney).toBe(1000000);
    expect(view.targetAmount).toBeGreaterThan(1000000);
    expect(view.monthlyBasis).toBe('planned');
    expect(view.expectedReturn).toMatchObject({ pct: 10, basis: 'override' });
    expect(view.projectedValue).toBeCloseTo(futureValue(200000, 20000, 60, 10), 6);
    expect(view.requiredPath.at(-1)?.value).toBeCloseTo(view.targetAmount, 2);
    expect(view.projection).toHaveLength(61);
  });
});
