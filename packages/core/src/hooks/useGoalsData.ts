import { useCallback, useMemo, useState } from 'react';
import {
  useCryptoCoinPricesQuery,
  useCryptoTransactionsQuery,
  useEpfQuery,
  useEpfTimelineQuery,
  useFixedDepositsQuery,
  useGoldTransactionsQuery,
  useMfapiLatestNavQuery,
  useMutualFundInfoFetchQuery,
  useMutualFundTransactionsQuery,
  useRecurringDepositsQuery,
  useSafeGoldRatesQuery,
} from '../api';
import { useStocksPortfolioQuery } from '../api/query/stocks';
import { useUserGoalsQuery } from '../api/query/userGoals';
import { useInflationQuery } from '../api/query/inflation';
import { latestNavMap } from '../calc/portfolioCalculations';
import { groupCryptoHoldings, heldCoinSymbols } from '../calc/cryptoHoldings';
import { resolveInflationPct } from '../calc/epfProjection';
import {
  allocatedPercentByHolding,
  buildCryptoHoldings,
  buildEpfHolding,
  buildFixedDepositHoldings,
  buildFundHoldings,
  buildGoalView,
  buildGoldHolding,
  buildRecurringDepositHoldings,
  buildStockHoldings,
  GoalHolding,
  GoalView,
  indexHoldings,
  summariseGoals,
} from '../calc/goals';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GOLD_RATE_LOOKBACK_DAYS = 7;
const INFLATION_LOOKBACK_YEARS = 5;

function goldRateWindow() {
  const now = new Date();
  return {
    endDate: now.toISOString().slice(0, 10),
    startDate: new Date(now.getTime() - GOLD_RATE_LOOKBACK_DAYS * MS_PER_DAY)
      .toISOString()
      .slice(0, 10),
  };
}

function latestGoldRate(rates: { rate: string }[] | undefined): number {
  return rates?.length ? parseFloat(rates[rates.length - 1].rate) : 0;
}

export function useGoalHoldings() {
  const [goldWindow] = useState(goldRateWindow);
  const stocksQuery = useStocksPortfolioQuery();
  const mfTransactionsQuery = useMutualFundTransactionsQuery();
  const mfInfoQuery = useMutualFundInfoFetchQuery();
  const cryptoTransactionsQuery = useCryptoTransactionsQuery();
  const goldTransactionsQuery = useGoldTransactionsQuery();
  const goldRatesQuery = useSafeGoldRatesQuery(goldWindow);
  const epfQuery = useEpfQuery();
  const epfTimelineQuery = useEpfTimelineQuery();
  const fdQuery = useFixedDepositsQuery();
  const rdQuery = useRecurringDepositsQuery();

  const schemeNumbers = useMemo(
    () => Array.from(new Set((mfInfoQuery.data ?? []).map((info) => info.schemeNumber))),
    [mfInfoQuery.data]
  );
  const navQuery = useMfapiLatestNavQuery(schemeNumbers);
  const heldCoins = useMemo(
    () => heldCoinSymbols(groupCryptoHoldings(cryptoTransactionsQuery.data ?? [])),
    [cryptoTransactionsQuery.data]
  );
  const coinPricesQuery = useCryptoCoinPricesQuery(heldCoins);

  const holdings = useMemo<GoalHolding[]>(() => {
    const now = new Date();
    const gold = buildGoldHolding(
      goldTransactionsQuery.data ?? [],
      latestGoldRate(goldRatesQuery.data?.data),
      now
    );
    const epf = buildEpfHolding(epfQuery.data ?? [], epfTimelineQuery.data, now);
    return [
      ...buildStockHoldings(
        stocksQuery.data?.portfolio ?? [],
        stocksQuery.data?.transactions ?? [],
        now
      ),
      ...buildFundHoldings(
        mfTransactionsQuery.data ?? [],
        mfInfoQuery.data ?? [],
        latestNavMap(schemeNumbers, navQuery.data),
        now
      ),
      ...buildCryptoHoldings(
        cryptoTransactionsQuery.data ?? [],
        coinPricesQuery.data?.data ?? {},
        now
      ),
      ...(gold ? [gold] : []),
      ...(epf ? [epf] : []),
      ...buildFixedDepositHoldings(fdQuery.data ?? [], now),
      ...buildRecurringDepositHoldings(rdQuery.data ?? [], now),
    ];
  }, [
    stocksQuery.data,
    mfTransactionsQuery.data,
    mfInfoQuery.data,
    schemeNumbers,
    navQuery.data,
    cryptoTransactionsQuery.data,
    coinPricesQuery.data,
    goldTransactionsQuery.data,
    goldRatesQuery.data,
    epfQuery.data,
    epfTimelineQuery.data,
    fdQuery.data,
    rdQuery.data,
  ]);

  const isLoading =
    stocksQuery.isLoading ||
    mfTransactionsQuery.isLoading ||
    mfInfoQuery.isLoading ||
    navQuery.isLoading ||
    cryptoTransactionsQuery.isLoading ||
    coinPricesQuery.isLoading ||
    goldTransactionsQuery.isLoading ||
    goldRatesQuery.isLoading ||
    epfQuery.isLoading ||
    epfTimelineQuery.isLoading ||
    fdQuery.isLoading ||
    rdQuery.isLoading;

  const refetch = () =>
    Promise.all([
      stocksQuery.refetch(),
      mfTransactionsQuery.refetch(),
      navQuery.refetch(),
      cryptoTransactionsQuery.refetch(),
      coinPricesQuery.refetch(),
      goldTransactionsQuery.refetch(),
      goldRatesQuery.refetch(),
      epfTimelineQuery.refetch(),
      fdQuery.refetch(),
      rdQuery.refetch(),
    ]);

  return { holdings, isLoading, refetch };
}

export type GoalsData = ReturnType<typeof useGoalsData>;

export function useGoalsData() {
  const goalsQuery = useUserGoalsQuery();
  const inflationQuery = useInflationQuery(INFLATION_LOOKBACK_YEARS);
  const { holdings, isLoading: holdingsLoading, refetch: refetchHoldings } = useGoalHoldings();
  const inflationPct = resolveInflationPct(inflationQuery.data?.average);

  const holdingsByKey = useMemo(() => indexHoldings(holdings), [holdings]);
  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);

  const views = useMemo<GoalView[]>(
    () => goals.map((goal) => buildGoalView(goal, { holdingsByKey, inflationPct })),
    [goals, holdingsByKey, inflationPct]
  );
  const summary = useMemo(() => summariseGoals(views), [views]);
  const allocatedByHolding = useCallback(
    (excludeGoalId?: string) => allocatedPercentByHolding(goals, excludeGoalId),
    [goals]
  );

  const refetch = () => Promise.all([goalsQuery.refetch(), refetchHoldings()]);

  return {
    goals,
    views,
    summary,
    holdings,
    holdingsByKey,
    inflationPct,
    allocatedByHolding,
    isLoading: goalsQuery.isLoading,
    isHoldingsLoading: holdingsLoading,
    refetch,
  };
}
