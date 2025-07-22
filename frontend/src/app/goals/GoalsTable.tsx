'use client';

import { useMemo } from 'react';
import { useUserGoalsQuery } from '@/api/query/userGoals';
import {
  useStockTransactionsQuery,
  useMutualFundInfoFetchQuery,
  useCryptoTransactionsQuery,
  useMutualFundTransactionsQuery,
  useMfapiNavHistoryBatchQuery,
  useNseQuoteQuery,
  useSafeGoldRatesQuery,
  useGoldTransactionsQuery,
} from '@/api/query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import _ from 'lodash';

// Helper functions
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);

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

export default function GoalsTable() {
  // Fetch goals
  const { data: goals, isLoading: goalsLoading } = useUserGoalsQuery();

  // Fetch transaction data for calculations
  const { data: stockTransactions } = useStockTransactionsQuery();
  const { data: mfInfoData } = useMutualFundInfoFetchQuery();
  const { data: mutualFundsTransactionsData } = useMutualFundTransactionsQuery();
  const { data: cryptoTransactions } = useCryptoTransactionsQuery();
  const { data: goldTransactions } = useGoldTransactionsQuery();

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

  // Get gold rates
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: goldRatesData } = useSafeGoldRatesQuery({ startDate, endDate });

  // Calculate current gold rate
  const currentGoldRate = useMemo(() => {
    if (!goldRatesData?.data || goldRatesData.data.length === 0) return 0;
    return parseFloat(goldRatesData.data[goldRatesData.data.length - 1].rate);
  }, [goldRatesData]);

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
  const cryptoPortfolioMap = useMemo(() => {
    if (!cryptoTransactions) return {};
    const grouped = _.groupBy(
      cryptoTransactions,
      (tx) => tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase()
    );
    const map: Record<string, number> = {};

    Object.entries(grouped).forEach(([symbol, txs]) => {
      let units = 0;
      txs.forEach((tx) => {
        if (tx.type === 'credit') {
          units += tx.quantity ?? 0;
        } else if (tx.type === 'debit') {
          units -= tx.quantity ?? 0;
        }
      });
      // For crypto, we'll use a placeholder value since we don't have current prices
      // In a real implementation, you'd fetch current crypto prices
      if (units > 0) {
        map[symbol] = units * 1000; // Placeholder value
      }
    });
    return map;
  }, [cryptoTransactions]);

  // Process goals with progress calculations
  const goalsWithProgress = useMemo((): GoalWithProgress[] => {
    if (!goals) return [];

    // Define a minimal Goal type inline for type safety
    type Goal = {
      _id?: string;
      goalName: string;
      description?: string;
      targetAmount?: number;
      goldAlloted?: number;
      stockSymbols?: string[];
      mutualFundIds?: string[];
      cryptoCurrency?: string[];
    };
    return (goals as Goal[]).map((goal) => {
      let currentValue = 0;
      const assetBreakdown = {
        stocks: { value: 0, count: 0 },
        mutualFunds: { value: 0, count: 0 },
        gold: { value: 0, grams: 0 },
        crypto: { value: 0, count: 0 },
      };

      // Calculate stock values
      if (goal.stockSymbols && goal.stockSymbols.length > 0) {
        goal.stockSymbols.forEach((stockName: string) => {
          const value = stockPortfolioMap[stockName] || 0;
          currentValue += value;
          assetBreakdown.stocks.value += value;
          if (value > 0) assetBreakdown.stocks.count++;
        });
      }

      // Calculate mutual fund values
      if (goal.mutualFundIds && goal.mutualFundIds.length > 0) {
        goal.mutualFundIds.forEach((fundId: string) => {
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

      // Calculate gold value
      if (goal.goldAlloted && goal.goldAlloted > 0) {
        const goldValue = goal.goldAlloted * currentGoldRate;
        currentValue += goldValue;
        assetBreakdown.gold.value = goldValue;
        assetBreakdown.gold.grams = goal.goldAlloted;
      }

      // Calculate crypto values
      if (goal.cryptoCurrency && goal.cryptoCurrency.length > 0) {
        goal.cryptoCurrency.forEach((coinName: string) => {
          const value = cryptoPortfolioMap[coinName] || 0;
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
        // For gold goals without target amount, show grams progress
        const totalGoldGrams =
          goldTransactions?.reduce(
            (sum, tx) => sum + (tx.type === 'credit' ? tx.quantity : -tx.quantity),
            0
          ) || 0;
        progressPercentage = totalGoldGrams > 0 ? (goal.goldAlloted / totalGoldGrams) * 100 : 0;
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
    currentGoldRate,
    cryptoPortfolioMap,
    mfInfoData,
    goldTransactions,
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
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Financial Goals</h2>
      {goalsWithProgress.map((goal) => (
        <Card key={goal._id} className="p-6">
          <div className="space-y-4">
            {/* Goal Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{goal.goalName}</h3>
                {goal.description && (
                  <p className="text-muted-foreground text-sm mt-1">{goal.description}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{formatCurrency(goal.currentValue)}</div>
                {goal.targetAmount && (
                  <div className="text-sm text-muted-foreground">
                    Target: {formatCurrency(goal.targetAmount)}
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{goal.progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(goal.progressPercentage, 100)}
                className="h-2"
                indicatorClassName={getProgressColor(goal.progressPercentage)}
              />
            </div>

            {/* Asset Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {goal.assetBreakdown.stocks.count > 0 && (
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-700">
                    {formatCurrency(goal.assetBreakdown.stocks.value)}
                  </div>
                  <div className="text-xs text-blue-600">
                    {goal.assetBreakdown.stocks.count} Stock
                    {goal.assetBreakdown.stocks.count !== 1 ? 's' : ''}
                  </div>
                </div>
              )}

              {goal.assetBreakdown.mutualFunds.count > 0 && (
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-700">
                    {formatCurrency(goal.assetBreakdown.mutualFunds.value)}
                  </div>
                  <div className="text-xs text-green-600">
                    {goal.assetBreakdown.mutualFunds.count} Fund
                    {goal.assetBreakdown.mutualFunds.count !== 1 ? 's' : ''}
                  </div>
                </div>
              )}

              {goal.assetBreakdown.gold.grams > 0 && (
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-lg font-semibold text-yellow-700">
                    {formatCurrency(goal.assetBreakdown.gold.value)}
                  </div>
                  <div className="text-xs text-yellow-600">
                    {goal.assetBreakdown.gold.grams}g Gold
                  </div>
                </div>
              )}

              {goal.assetBreakdown.crypto.count > 0 && (
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-semibold text-purple-700">
                    {formatCurrency(goal.assetBreakdown.crypto.value)}
                  </div>
                  <div className="text-xs text-purple-600">
                    {goal.assetBreakdown.crypto.count} Crypto
                  </div>
                </div>
              )}
            </div>

            {/* Asset Tags */}
            <div className="flex flex-wrap gap-2">
              {goal.stockSymbols && goal.stockSymbols.length > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {goal.stockSymbols.length} Stock{goal.stockSymbols.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {goal.mutualFundIds && goal.mutualFundIds.length > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {goal.mutualFundIds.length} Fund{goal.mutualFundIds.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {goal.goldAlloted && goal.goldAlloted > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {goal.goldAlloted}g Gold
                </Badge>
              )}
              {goal.cryptoCurrency && goal.cryptoCurrency.length > 0 && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {goal.cryptoCurrency.length} Crypto
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
