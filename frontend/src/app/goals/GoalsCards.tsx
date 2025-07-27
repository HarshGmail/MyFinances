'use client';

import { useMemo, useState } from 'react';
import { useUserGoalsQuery } from '@/api/query/userGoals';
import {
  useStockTransactionsQuery,
  useMutualFundInfoFetchQuery,
  useCryptoTransactionsQuery,
  useMutualFundTransactionsQuery,
  useMfapiNavHistoryBatchQuery,
  useNseQuoteQuery,
  useGoldTransactionsQuery,
  useCryptoCoinPricesQuery,
} from '@/api/query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import _ from 'lodash';
import { Pencil } from 'lucide-react';
import GoalEditDrawer from './GoalEditDrawer';
import type { AssetOption } from './GoalAssetSelector';
import { formatCurrency } from '@/utils/numbers';

const getProgressColor = (percentage: number) => {
  if (percentage >= 100) return 'bg-green-500';
  if (percentage >= 75) return 'bg-blue-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

interface GoalWithProgress {
  _id?: string;
  goalName: string;
  description?: string;
  targetAmount?: number;
  goldAlloted?: number;
  stockSymbols?: string[];
  mutualFundIds?: string[];
  cryptoCurrency?: string[];
  currentValue: number;
  progressPercentage: number;
  assetBreakdown: {
    stocks: { value: number; count: number };
    mutualFunds: { value: number; count: number };
    gold: { value: number; grams: number };
    crypto: { value: number; count: number };
  };
}

export default function Goals() {
  const [editGoal, setEditGoal] = useState<GoalWithProgress | null>(null);
  // Fetch goals
  const { data: goals, isLoading: goalsLoading } = useUserGoalsQuery();

  // Fetch transaction data for calculations
  const { data: stockTransactions } = useStockTransactionsQuery();
  const { data: mfInfoData } = useMutualFundInfoFetchQuery();
  const { data: mutualFundsTransactionsData } = useMutualFundTransactionsQuery();
  const { data: cryptoTransactions } = useCryptoTransactionsQuery();
  const { data: goldTransactions } = useGoldTransactionsQuery();

  // Fetch asset options
  const { data: stockData } = useStockTransactionsQuery();
  const { data: mfData } = useMutualFundInfoFetchQuery();
  const { data: cryptoTxData } = useCryptoTransactionsQuery();

  const stockOptions: AssetOption[] = useMemo(
    () =>
      Array.from(new Set((stockData || []).map((s) => s.stockName)))
        .filter((name): name is string => Boolean(name))
        .sort()
        .map((name) => ({ type: 'stock' as const, value: String(name), label: String(name) })),
    [stockData]
  );
  const mutualFundOptions: AssetOption[] = useMemo(
    () =>
      (mfData || [])
        .filter((mf) => mf.fundName && mf._id)
        .map((mf) => ({
          type: 'mutualFund' as const,
          value: String(mf._id),
          label: String(mf.fundName),
        })),
    [mfData]
  );
  const cryptoOptions: AssetOption[] = useMemo(() => {
    if (!cryptoTxData) return [];
    return Array.from(
      new Set(
        cryptoTxData.map(
          (tx: { coinName?: string; coinSymbol?: string }) => tx.coinName || tx.coinSymbol
        )
      )
    )
      .filter((name): name is string => Boolean(name))
      .sort()
      .map((name) => ({ type: 'crypto' as const, value: String(name), label: String(name) }));
  }, [cryptoTxData]);

  // Fetch current prices
  const stockNames = useMemo(() => {
    if (!stockTransactions) return [];
    return Array.from(new Set(stockTransactions.map((s) => s.stockName))).filter(Boolean);
  }, [stockTransactions]);
  const { data: nseQuoteData } = useNseQuoteQuery(stockNames);

  // Get scheme numbers for mutual funds
  const schemeNumbers = useMemo(() => {
    if (!mfInfoData) return [];
    return Array.from(new Set(mfInfoData.map((info) => info.schemeNumber)));
  }, [mfInfoData]);
  const { data: navHistoryBatch } = useMfapiNavHistoryBatchQuery(schemeNumbers);

  // Build NAV data map for mutual funds
  const navDataMap = useMemo(() => {
    const map: Record<string, { nav: number; navDate: string } | null> = {};
    schemeNumbers.forEach((schemeNumber) => {
      const navData = navHistoryBatch?.[schemeNumber];
      if (navData && navData.data && navData.data.length > 0) {
        map[schemeNumber] = {
          nav: parseFloat(navData.data[0].nav),
          navDate: navData.data[0].date,
        };
      } else {
        map[schemeNumber] = null;
      }
    });
    return map;
  }, [schemeNumbers, navHistoryBatch]);

  // Calculate stock portfolio values
  const stockPortfolioMap = useMemo(() => {
    if (!stockTransactions) return {};
    const grouped = _.groupBy(stockTransactions, 'stockName');
    const map: Record<string, number> = {};

    Object.entries(grouped).forEach(([stockName, txs]) => {
      const totalShares = txs.reduce((sum, tx) => sum + (tx.numOfShares ?? 0), 0);
      const stockData = nseQuoteData?.[stockName];
      const currentPrice = stockData?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (currentPrice && totalShares > 0) {
        map[stockName] = currentPrice * totalShares;
      }
    });
    return map;
  }, [stockTransactions, nseQuoteData]);

  // Calculate mutual fund portfolio values
  const mfPortfolioMap = useMemo(() => {
    if (!mutualFundsTransactionsData || !mfInfoData) return {};
    const grouped = _.groupBy(mutualFundsTransactionsData, 'fundName');
    const map: Record<string, number> = {};

    Object.entries(grouped).forEach(([fundName, txs]) => {
      const totalUnits = txs.reduce((sum, tx) => sum + tx.numOfUnits, 0);
      const info = mfInfoData.find((info) => info.fundName === fundName);
      const schemeNumber = info?.schemeNumber;
      const navInfo = schemeNumber ? navDataMap[schemeNumber] : null;
      const currentNav = navInfo ? navInfo.nav : null;
      if (currentNav && totalUnits > 0) {
        map[fundName] = totalUnits * currentNav;
      }
    });
    return map;
  }, [mutualFundsTransactionsData, mfInfoData, navDataMap]);

  // Calculate crypto portfolio values
  const cryptoInvestedMap = useMemo(() => {
    if (!cryptoTransactions) return {};
    const grouped = _.groupBy(
      cryptoTransactions,
      (tx) => tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase()
    );
    const map: Record<string, { invested: number; units: number; coinName: string }> = {};

    Object.entries(grouped).forEach(([symbol, txs]) => {
      let invested = 0;
      let units = 0;
      let coinName = '';
      txs.forEach((tx) => {
        if (tx.type === 'credit') {
          invested += tx.amount;
          units += tx.quantity ?? 0;
        } else if (tx.type === 'debit') {
          invested -= tx.amount;
          units -= tx.quantity ?? 0;
        }
        coinName = tx.coinName;
      });
      map[symbol] = { invested, units, coinName };
    });
    return map;
  }, [cryptoTransactions]);

  const validCoins = useMemo(() => {
    return Object.entries(cryptoInvestedMap)
      .filter(([, v]) => v.units > 0)
      .map(([symbol]) => symbol);
  }, [cryptoInvestedMap]);

  const { data: coinPrices } = useCryptoCoinPricesQuery(validCoins);

  const cryptoPortfolioMap = useMemo(() => {
    if (!coinPrices?.data) return {};
    const map: Record<string, number> = {};
    console.log(validCoins);

    validCoins.forEach((coinSymbol) => {
      const currentPrice = coinPrices.data[coinSymbol] || 0;
      const units = cryptoInvestedMap[coinSymbol]?.units || 0;
      if (units > 0 && currentPrice > 0) {
        map[coinSymbol] = units * currentPrice;
      }
    });
    return map;
  }, [coinPrices, cryptoInvestedMap, validCoins]);

  // Build a map from coin name to symbol
  const coinNameToSymbol = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(cryptoInvestedMap).forEach(([symbol, { coinName }]) => {
      if (coinName) map[coinName] = symbol;
    });
    return map;
  }, [cryptoInvestedMap]);

  // Process goals with progress calculations
  const goalsWithProgress = useMemo((): GoalWithProgress[] => {
    if (!goals) return [];

    return goals.map((goal) => {
      let currentValue = 0;
      const assetBreakdown = {
        stocks: { value: 0, count: 0 },
        mutualFunds: { value: 0, count: 0 },
        gold: { value: 0, grams: 0 },
        crypto: { value: 0, count: 0 },
      };

      // Calculate stock values
      if (goal.stockSymbols && goal.stockSymbols.length > 0) {
        goal.stockSymbols.forEach((stockName) => {
          const value = stockPortfolioMap[stockName] || 0;
          currentValue += value;
          assetBreakdown.stocks.value += value;
          if (value > 0) assetBreakdown.stocks.count++;
        });
      }

      // Calculate mutual fund values
      if (goal.mutualFundIds && goal.mutualFundIds.length > 0) {
        goal.mutualFundIds.forEach((fundId) => {
          // Find fund name by ID
          const fundInfo = mfInfoData?.find((info) => info._id === fundId);
          if (fundInfo?.fundName) {
            const value = mfPortfolioMap[fundInfo.fundName] || 0;
            currentValue += value;
            assetBreakdown.mutualFunds.value += value;
            if (value > 0) assetBreakdown.mutualFunds.count++;
          }
        });
      }

      // Calculate gold progress (grams-based)
      if (goal.goldAlloted && goal.goldAlloted > 0) {
        // Calculate total gold owned by user from transactions
        const totalGoldGrams =
          goldTransactions?.reduce(
            (sum, tx) => sum + (tx.type === 'credit' ? tx.quantity : -tx.quantity),
            0
          ) || 0;

        // For gold goals, we track grams progress, not monetary value
        assetBreakdown.gold.grams = goal.goldAlloted;
        assetBreakdown.gold.value = totalGoldGrams; // Show current grams owned
      }

      // Calculate crypto values
      if (goal.cryptoCurrency && goal.cryptoCurrency.length > 0) {
        goal.cryptoCurrency.forEach((coinName) => {
          const symbol = coinNameToSymbol[coinName];
          const value = symbol ? cryptoPortfolioMap[symbol] || 0 : 0;
          currentValue += value;
          assetBreakdown.crypto.value += value;
          if (value > 0) assetBreakdown.crypto.count++;
        });
      }

      // Calculate progress percentage
      let progressPercentage = 0;
      if (goal.targetAmount && goal.targetAmount > 0) {
        progressPercentage = (currentValue / goal.targetAmount) * 100;
      } else if (goal.goldAlloted && goal.goldAlloted > 0) {
        // For gold goals, show grams progress: (current grams / target grams) * 100
        const totalGoldGrams =
          goldTransactions?.reduce(
            (sum, tx) => sum + (tx.type === 'credit' ? tx.quantity : -tx.quantity),
            0
          ) || 0;
        progressPercentage = totalGoldGrams > 0 ? (totalGoldGrams / goal.goldAlloted) * 100 : 0;
      }

      return {
        ...goal,
        currentValue,
        progressPercentage,
        assetBreakdown,
      };
    });
  }, [
    goals,
    stockPortfolioMap,
    mfPortfolioMap,
    cryptoPortfolioMap,
    mfInfoData,
    goldTransactions,
    coinNameToSymbol,
  ]);

  if (goalsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-32" />
        <Skeleton className="w-full h-32" />
        <Skeleton className="w-full h-32" />
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <h3 className="text-lg font-semibold mb-2">No Goals Found</h3>
          <p>Create your first financial goal to start tracking your progress.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {goalsWithProgress.map((goal) => (
        <Card key={goal._id} className="p-4 relative">
          <div className="space-y-3">
            {/* Goal Header */}
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-base font-semibold truncate">{goal.goalName}</h3>
                {goal.description && (
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                    {goal.description}
                  </p>
                )}
              </div>
              <div className="text-right ml-2">
                {goal.goldAlloted && goal.goldAlloted > 0 ? (
                  <>
                    <div className="text-lg font-bold">{goal.assetBreakdown.gold.value}g</div>
                    <div className="text-xs text-muted-foreground">Target: {goal.goldAlloted}g</div>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold">{formatCurrency(goal.currentValue)}</div>
                    {goal.targetAmount && (
                      <div className="text-xs text-muted-foreground">
                        Target: {formatCurrency(goal.targetAmount)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span className="font-medium">{goal.progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(goal.progressPercentage, 100)}
                className="h-1.5"
                indicatorClassName={getProgressColor(goal.progressPercentage)}
              />
            </div>

            {/* Asset Tags */}
            <div className="flex items-center gap-2">
              {goal.stockSymbols && goal.stockSymbols.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                >
                  {goal.stockSymbols.length} Stock{goal.stockSymbols.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {goal.mutualFundIds && goal.mutualFundIds.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 text-xs"
                >
                  {goal.mutualFundIds.length} Fund{goal.mutualFundIds.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {goal.goldAlloted && goal.goldAlloted > 0 && (
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                >
                  {goal.goldAlloted}g Gold
                </Badge>
              )}
              {goal.cryptoCurrency && goal.cryptoCurrency.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
                >
                  {goal.cryptoCurrency.length} Crypto
                </Badge>
              )}
              <div className="flex flex-wrap gap-1 items-center">
                <div className="cursor-pointer" onClick={() => setEditGoal(goal)}>
                  <Pencil size={16} strokeWidth={0.5} />
                </div>
              </div>
            </div>
            {editGoal && editGoal._id === goal._id && (
              <GoalEditDrawer
                goal={editGoal}
                onClose={() => setEditGoal(null)}
                assetOptions={{
                  stocks: stockOptions,
                  mutualFunds: mutualFundOptions,
                  crypto: cryptoOptions,
                }}
              />
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
