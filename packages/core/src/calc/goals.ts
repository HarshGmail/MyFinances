import { addMonths, differenceInCalendarDays, differenceInMonths } from 'date-fns';
import groupBy from 'lodash/groupBy';
import type {
  CryptoTransaction,
  EpfAccount,
  EpfTimelineSummary,
  FixedDeposit,
  GoalAllocation,
  GoalAssetType,
  GoldTransaction,
  MutualFundInfo,
  MutualFundTransaction,
  RecurringDeposit,
  StockTransaction,
  StocksPortfolioItem,
  UserGoal,
} from '../types';
import { holdingXirrPercent } from './holdingXirr';
import { calcMFPortfolio, epfContributionFlows, MFNavDataMap } from './portfolioCalculations';
import { groupCryptoHoldings, valueCryptoHoldings } from './cryptoHoldings';
import { goldCashFlow, netGoldInvested, totalGoldGrams } from './goldCategories';
import { fixedDepositProgress, recurringDepositProgress } from './deposits';

const PERCENT = 100;
const MONTHS_PER_YEAR = 12;
const DAYS_PER_YEAR = 365;
const FULL_ALLOCATION = 100;
const ALLOCATION_EPSILON = 0.001;
const MIN_HISTORY_DAYS_FOR_OWN_RETURN = DAYS_PER_YEAR;
const OWN_RETURN_FLOOR_PCT = -5;
const OWN_RETURN_CEILING_PCT = 25;
const FALLBACK_RETURN_PCT = 8;
const MANUAL_RETURN_PCT = 0;
const TRAILING_CONTRIBUTION_MONTHS = 12;
const SLIGHTLY_BEHIND_RATIO = 0.9;

export const GOLD_HOLDING_KEY = 'gold';
export const EPF_HOLDING_KEY = 'epf';

export const GOAL_ASSET_TYPES: GoalAssetType[] = [
  'stock',
  'mutualFund',
  'crypto',
  'gold',
  'epf',
  'fd',
  'rd',
];

export const GOAL_ASSET_LABELS: Record<GoalAssetType | 'manual', string> = {
  stock: 'Stocks',
  mutualFund: 'Mutual Funds',
  crypto: 'Crypto',
  gold: 'Gold',
  epf: 'EPF',
  fd: 'Fixed Deposits',
  rd: 'Recurring Deposits',
  manual: 'Other savings',
};

export const DEFAULT_RETURN_BY_TYPE: Record<GoalAssetType, number> = {
  stock: 12,
  mutualFund: 12,
  crypto: 10,
  gold: 8,
  epf: 8.25,
  fd: 7,
  rd: 7,
};

export interface GoalCashFlow {
  date: Date;
  amount: number;
}

export interface GoalHolding {
  assetType: GoalAssetType;
  assetKey: string;
  label: string;
  currentValue: number;
  invested: number;
  cashFlows: GoalCashFlow[];
  ratePct: number | null;
  xirrPct: number | null;
  firstInvestedAt: Date | null;
}

export type GoalStatus = 'achieved' | 'on-track' | 'slightly-behind' | 'behind';
export type ReturnBasis = 'override' | 'rate' | 'history' | 'default';
export type GoalValueByType = Record<GoalAssetType | 'manual', number>;

export interface GoalLine {
  allocation: GoalAllocation;
  holding: GoalHolding | null;
  value: number;
  invested: number;
  profitLoss: number;
}

export interface GoalValue {
  currentValue: number;
  invested: number;
  profitLoss: number;
  byType: GoalValueByType;
  lines: GoalLine[];
}

export interface ReturnSource {
  label: string;
  assetType: GoalAssetType | 'manual';
  pct: number;
  basis: ReturnBasis;
  weight: number;
}

export interface ExpectedReturn {
  pct: number;
  blendedPct: number;
  basis: ReturnBasis;
  sources: ReturnSource[];
}

export interface ValuePoint {
  date: Date;
  value: number;
}

export interface GoalView {
  goal: UserGoal;
  value: GoalValue;
  targetAmount: number;
  targetInTodaysMoney: number;
  progressPct: number;
  remaining: number;
  monthsLeft: number;
  expectedReturn: ExpectedReturn;
  requiredMonthly: number;
  currentMonthly: number;
  monthlyBasis: 'planned' | 'trailing';
  projectedValue: number;
  projection: ValuePoint[];
  requiredPath: ValuePoint[];
  investedSeries: ValuePoint[];
  status: GoalStatus;
}

export interface GoalsSummary {
  totalSaved: number;
  totalTarget: number;
  achievedCount: number;
  onTrackCount: number;
  totalRequiredMonthly: number;
  totalCurrentMonthly: number;
}

export function holdingKey(assetType: GoalAssetType, assetKey: string): string {
  return `${assetType}:${assetKey}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function signedAmount(tx: { type: 'credit' | 'debit'; amount: number }): number {
  return tx.type === 'credit' ? tx.amount : -tx.amount;
}

function earliestFlowDate(flows: GoalCashFlow[]): Date | null {
  return flows.reduce<Date | null>(
    (earliest, flow) => (earliest === null || flow.date < earliest ? flow.date : earliest),
    null
  );
}

function flowXirrPct(flows: GoalCashFlow[], currentValue: number, now: Date): number | null {
  return holdingXirrPercent(
    flows.map((flow) => ({
      type: flow.amount >= 0 ? 'credit' : 'debit',
      amount: Math.abs(flow.amount),
      date: flow.date,
    })),
    currentValue,
    now
  );
}

function marketHolding(
  base: Omit<GoalHolding, 'ratePct' | 'xirrPct' | 'firstInvestedAt'>,
  now: Date
): GoalHolding {
  return {
    ...base,
    ratePct: null,
    xirrPct: flowXirrPct(base.cashFlows, base.currentValue, now),
    firstInvestedAt: earliestFlowDate(base.cashFlows),
  };
}

export function buildStockHoldings(
  portfolio: StocksPortfolioItem[],
  transactions: StockTransaction[],
  now: Date = new Date()
): GoalHolding[] {
  const byStock = groupBy(transactions, 'stockName');
  return portfolio
    .filter((stock) => stock.numOfShares > 0)
    .map((stock) =>
      marketHolding(
        {
          assetType: 'stock',
          assetKey: stock.stockName,
          label: stock.stockName,
          currentValue: stock.currentValuation,
          invested: stock.investedAmount,
          cashFlows: (byStock[stock.stockName] ?? []).map((tx) => ({
            date: new Date(tx.date),
            amount: signedAmount({
              type: tx.type,
              amount: tx.amount || tx.marketPrice * tx.numOfShares,
            }),
          })),
        },
        now
      )
    );
}

export function buildFundHoldings(
  transactions: MutualFundTransaction[],
  mfInfo: MutualFundInfo[],
  navDataMap: MFNavDataMap,
  now: Date = new Date()
): GoalHolding[] {
  const byFund = groupBy(transactions, 'fundName');
  return calcMFPortfolio(transactions, mfInfo, navDataMap)
    .fundData.filter((fund) => fund.totalUnits > 0)
    .map((fund) =>
      marketHolding(
        {
          assetType: 'mutualFund',
          assetKey: fund.fundName,
          label: fund.fundName,
          currentValue: fund.currentValue ?? fund.totalInvested,
          invested: fund.totalInvested,
          cashFlows: (byFund[fund.fundName] ?? []).map((tx) => ({
            date: new Date(tx.date),
            amount: signedAmount(tx),
          })),
        },
        now
      )
    );
}

function cryptoGroupKey(tx: CryptoTransaction): string {
  return tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase();
}

export function buildCryptoHoldings(
  transactions: CryptoTransaction[],
  prices: Record<string, number | null>,
  now: Date = new Date()
): GoalHolding[] {
  const bySymbol = groupBy(transactions, cryptoGroupKey);
  return valueCryptoHoldings(groupCryptoHoldings(transactions), prices).map((position) =>
    marketHolding(
      {
        assetType: 'crypto',
        assetKey: position.coinName,
        label: position.coinName,
        currentValue: position.currentValue,
        invested: position.investedAmount,
        cashFlows: (bySymbol[position.currency] ?? []).map((tx) => ({
          date: new Date(tx.date),
          amount: signedAmount(tx),
        })),
      },
      now
    )
  );
}

export function buildGoldHolding(
  transactions: GoldTransaction[],
  ratePerGram: number,
  now: Date = new Date()
): GoalHolding | null {
  const grams = totalGoldGrams(transactions);
  if (grams <= 0) return null;
  return marketHolding(
    {
      assetType: 'gold',
      assetKey: GOLD_HOLDING_KEY,
      label: `Gold (${grams.toFixed(2)} g)`,
      currentValue: grams * ratePerGram,
      invested: netGoldInvested(transactions),
      cashFlows: transactions
        .map((tx) => ({ date: new Date(tx.date), amount: -goldCashFlow(tx) }))
        .filter((flow) => flow.amount !== 0),
    },
    now
  );
}

export function buildEpfHolding(
  accounts: EpfAccount[],
  timeline: EpfTimelineSummary | undefined,
  now: Date = new Date()
): GoalHolding | null {
  const currentValue = timeline?.totalCurrentBalance ?? 0;
  if (currentValue <= 0) return null;
  const cashFlows = epfContributionFlows(accounts, now).map((flow) => ({
    date: flow.when,
    amount: flow.amount,
  }));
  return {
    assetType: 'epf',
    assetKey: EPF_HOLDING_KEY,
    label: 'EPF',
    currentValue,
    invested: timeline?.totalContributions ?? 0,
    cashFlows,
    ratePct: DEFAULT_RETURN_BY_TYPE.epf,
    xirrPct: null,
    firstInvestedAt: earliestFlowDate(cashFlows),
  };
}

export function buildFixedDepositHoldings(
  deposits: FixedDeposit[],
  now: Date = new Date()
): GoalHolding[] {
  return deposits.map((fd) => {
    const created = new Date(fd.dateOfCreation);
    return {
      assetType: 'fd',
      assetKey: fd._id,
      label: fd.fixedDepositName,
      currentValue: fixedDepositProgress(fd, now).currentValue,
      invested: fd.amountInvested,
      cashFlows: [{ date: created, amount: fd.amountInvested }],
      ratePct: fd.rateOfInterest,
      xirrPct: null,
      firstInvestedAt: created,
    };
  });
}

function recurringDepositFlows(rd: RecurringDeposit, now: Date): GoalCashFlow[] {
  const created = new Date(rd.dateOfCreation);
  if (!rd.monthlyDeposit || rd.monthlyDeposit <= 0) {
    return [{ date: created, amount: rd.amountInvested }];
  }
  const lastDepositDate = new Date(Math.min(now.getTime(), new Date(rd.dateOfMaturity).getTime()));
  const flows: GoalCashFlow[] = [];
  let deposited = 0;
  for (
    let month = 0;
    addMonths(created, month) <= lastDepositDate && deposited < rd.amountInvested;
    month++
  ) {
    const amount = Math.min(rd.monthlyDeposit, rd.amountInvested - deposited);
    flows.push({ date: addMonths(created, month), amount });
    deposited += amount;
  }
  return flows.length ? flows : [{ date: created, amount: rd.amountInvested }];
}

export function buildRecurringDepositHoldings(
  deposits: RecurringDeposit[],
  now: Date = new Date()
): GoalHolding[] {
  return deposits.map((rd) => ({
    assetType: 'rd',
    assetKey: rd._id,
    label: rd.recurringDepositName,
    currentValue: recurringDepositProgress(rd, now).currentValue,
    invested: rd.amountInvested,
    cashFlows: recurringDepositFlows(rd, now),
    ratePct: rd.rateOfInterest,
    xirrPct: null,
    firstInvestedAt: new Date(rd.dateOfCreation),
  }));
}

export function indexHoldings(holdings: GoalHolding[]): Map<string, GoalHolding> {
  return new Map(
    holdings.map((holding) => [holdingKey(holding.assetType, holding.assetKey), holding])
  );
}

function emptyValueByType(): GoalValueByType {
  return {
    stock: 0,
    mutualFund: 0,
    crypto: 0,
    gold: 0,
    epf: 0,
    fd: 0,
    rd: 0,
    manual: 0,
  };
}

export function computeGoalValue(
  goal: Pick<UserGoal, 'allocations' | 'manualAmount'>,
  holdingsByKey: Map<string, GoalHolding>
): GoalValue {
  const byType = emptyValueByType();
  const lines = goal.allocations.map<GoalLine>((allocation) => {
    const holding =
      holdingsByKey.get(holdingKey(allocation.assetType, allocation.assetKey)) ?? null;
    const share = allocation.percent / PERCENT;
    const value = (holding?.currentValue ?? 0) * share;
    const invested = (holding?.invested ?? 0) * share;
    byType[allocation.assetType] += value;
    return { allocation, holding, value, invested, profitLoss: value - invested };
  });
  const manualAmount = goal.manualAmount ?? 0;
  byType.manual = manualAmount;
  const currentValue = sum(lines.map((line) => line.value)) + manualAmount;
  const invested = sum(lines.map((line) => line.invested)) + manualAmount;
  return { currentValue, invested, profitLoss: currentValue - invested, byType, lines };
}

export function holdingReturn(
  holding: GoalHolding,
  now: Date = new Date()
): { pct: number; basis: ReturnBasis } {
  if (holding.ratePct !== null) return { pct: holding.ratePct, basis: 'rate' };
  const heldDays = holding.firstInvestedAt
    ? differenceInCalendarDays(now, holding.firstInvestedAt)
    : 0;
  if (holding.xirrPct !== null && heldDays >= MIN_HISTORY_DAYS_FOR_OWN_RETURN) {
    return {
      pct: clamp(holding.xirrPct, OWN_RETURN_FLOOR_PCT, OWN_RETURN_CEILING_PCT),
      basis: 'history',
    };
  }
  return { pct: DEFAULT_RETURN_BY_TYPE[holding.assetType], basis: 'default' };
}

export function blendedExpectedReturn(value: GoalValue, now: Date = new Date()): ExpectedReturn {
  const holdingSources = value.lines
    .filter((line) => line.holding !== null)
    .map<ReturnSource>((line) => {
      const holding = line.holding as GoalHolding;
      return {
        label: holding.label,
        assetType: holding.assetType,
        ...holdingReturn(holding, now),
        weight: line.value,
      };
    });
  const manualSources: ReturnSource[] =
    value.byType.manual > 0
      ? [
          {
            label: GOAL_ASSET_LABELS.manual,
            assetType: 'manual',
            pct: MANUAL_RETURN_PCT,
            basis: 'default',
            weight: value.byType.manual,
          },
        ]
      : [];
  const sources = [...holdingSources, ...manualSources];
  const totalWeight = sum(sources.map((source) => source.weight));
  if (!sources.length) {
    return {
      pct: FALLBACK_RETURN_PCT,
      blendedPct: FALLBACK_RETURN_PCT,
      basis: 'default',
      sources,
    };
  }
  const weightOf = (source: ReturnSource) =>
    totalWeight > 0 ? source.weight / totalWeight : 1 / sources.length;
  const blendedPct = sum(sources.map((source) => source.pct * weightOf(source)));
  return {
    pct: blendedPct,
    blendedPct,
    basis: sources.every((source) => source.basis === 'history') ? 'history' : 'default',
    sources: sources.map((source) => ({ ...source, weight: weightOf(source) })),
  };
}

export function monthsUntil(targetDate: Date, now: Date = new Date()): number {
  return Math.max(0, differenceInMonths(targetDate, now));
}

export function inflatedTarget(
  targetAmount: number,
  inflationPct: number,
  targetDate: Date,
  now: Date = new Date()
): number {
  const years = Math.max(0, differenceInCalendarDays(targetDate, now) / DAYS_PER_YEAR);
  return targetAmount * Math.pow(1 + inflationPct / PERCENT, years);
}

export function monthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / PERCENT, 1 / MONTHS_PER_YEAR) - 1;
}

export function futureValue(
  presentValue: number,
  monthlyContribution: number,
  months: number,
  annualPct: number
): number {
  const rate = monthlyRate(annualPct);
  if (rate === 0) return presentValue + monthlyContribution * months;
  const growth = Math.pow(1 + rate, months);
  return presentValue * growth + (monthlyContribution * (growth - 1)) / rate;
}

export function requiredMonthly(
  presentValue: number,
  target: number,
  months: number,
  annualPct: number
): number {
  if (presentValue >= target) return 0;
  if (months <= 0) return target - presentValue;
  const rate = monthlyRate(annualPct);
  if (rate === 0) return (target - presentValue) / months;
  const growth = Math.pow(1 + rate, months);
  return Math.max(0, ((target - presentValue * growth) * rate) / (growth - 1));
}

export function projectValue(
  presentValue: number,
  monthlyContribution: number,
  months: number,
  annualPct: number,
  start: Date = new Date()
): ValuePoint[] {
  return Array.from({ length: months + 1 }, (_, month) => ({
    date: addMonths(start, month),
    value: futureValue(presentValue, monthlyContribution, month, annualPct),
  }));
}

export function scaledCashFlows(lines: GoalLine[]): GoalCashFlow[] {
  return lines.flatMap((line) =>
    (line.holding?.cashFlows ?? []).map((flow) => ({
      date: flow.date,
      amount: (flow.amount * line.allocation.percent) / PERCENT,
    }))
  );
}

export function trailingMonthlyContribution(
  flows: GoalCashFlow[],
  now: Date = new Date(),
  months: number = TRAILING_CONTRIBUTION_MONTHS
): number {
  const windowStart = addMonths(now, -months);
  const recent = flows.filter((flow) => flow.date > windowStart && flow.date <= now);
  return Math.max(0, sum(recent.map((flow) => flow.amount)) / months);
}

export function cumulativeSeries(flows: GoalCashFlow[]): ValuePoint[] {
  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  let running = 0;
  return sorted.map((flow) => {
    running += flow.amount;
    return { date: flow.date, value: Math.max(0, running) };
  });
}

export function goalStatus(
  currentValue: number,
  projectedValue: number,
  target: number
): GoalStatus {
  if (currentValue >= target) return 'achieved';
  if (projectedValue >= target) return 'on-track';
  if (projectedValue >= target * SLIGHTLY_BEHIND_RATIO) return 'slightly-behind';
  return 'behind';
}

export function allocatedPercentByHolding(
  goals: Pick<UserGoal, '_id' | 'allocations'>[],
  excludeGoalId?: string
): Record<string, number> {
  const allocated: Record<string, number> = {};
  goals
    .filter((goal) => goal._id !== excludeGoalId)
    .forEach((goal) =>
      goal.allocations.forEach((allocation) => {
        const key = holdingKey(allocation.assetType, allocation.assetKey);
        allocated[key] = (allocated[key] ?? 0) + allocation.percent;
      })
    );
  return allocated;
}

export function freePercent(allocated: Record<string, number>, key: string): number {
  return Math.max(0, FULL_ALLOCATION - (allocated[key] ?? 0));
}

export function isOverAllocated(requested: number, available: number): boolean {
  return requested > available + ALLOCATION_EPSILON;
}

export interface GoalViewContext {
  holdingsByKey: Map<string, GoalHolding>;
  inflationPct: number;
  now?: Date;
}

export function buildGoalView(goal: UserGoal, context: GoalViewContext): GoalView {
  const now = context.now ?? new Date();
  const targetDate = new Date(goal.targetDate);
  const value = computeGoalValue(goal, context.holdingsByKey);
  const blended = blendedExpectedReturn(value, now);
  const expectedReturn: ExpectedReturn =
    goal.expectedReturnPct !== undefined
      ? { ...blended, pct: goal.expectedReturnPct, basis: 'override' }
      : blended;
  const targetAmount = goal.inflationAdjusted
    ? inflatedTarget(goal.targetAmount, context.inflationPct, targetDate, now)
    : goal.targetAmount;
  const monthsLeft = monthsUntil(targetDate, now);
  const flows = scaledCashFlows(value.lines);
  const trailing = trailingMonthlyContribution(flows, now);
  const currentMonthly = goal.plannedMonthly ?? trailing;
  const required = requiredMonthly(
    value.currentValue,
    targetAmount,
    monthsLeft,
    expectedReturn.pct
  );
  const projection = projectValue(
    value.currentValue,
    currentMonthly,
    monthsLeft,
    expectedReturn.pct,
    now
  );
  const projectedValue = projection[projection.length - 1].value;
  const manualFlow: GoalCashFlow[] = goal.manualAmount
    ? [{ date: new Date(goal.createdAt), amount: goal.manualAmount }]
    : [];

  return {
    goal,
    value,
    targetAmount,
    targetInTodaysMoney: goal.targetAmount,
    progressPct: targetAmount > 0 ? (value.currentValue / targetAmount) * PERCENT : 0,
    remaining: Math.max(0, targetAmount - value.currentValue),
    monthsLeft,
    expectedReturn,
    requiredMonthly: required,
    currentMonthly,
    monthlyBasis: goal.plannedMonthly !== undefined ? 'planned' : 'trailing',
    projectedValue,
    projection,
    requiredPath:
      value.currentValue >= targetAmount
        ? []
        : projectValue(value.currentValue, required, monthsLeft, expectedReturn.pct, now),
    investedSeries: cumulativeSeries([...flows, ...manualFlow]),
    status: goalStatus(value.currentValue, projectedValue, targetAmount),
  };
}

export function summariseGoals(views: GoalView[]): GoalsSummary {
  return {
    totalSaved: sum(views.map((view) => view.value.currentValue)),
    totalTarget: sum(views.map((view) => view.targetAmount)),
    achievedCount: views.filter((view) => view.status === 'achieved').length,
    onTrackCount: views.filter((view) => view.status === 'on-track' || view.status === 'achieved')
      .length,
    totalRequiredMonthly: sum(views.map((view) => view.requiredMonthly)),
    totalCurrentMonthly: sum(views.map((view) => view.currentMonthly)),
  };
}
