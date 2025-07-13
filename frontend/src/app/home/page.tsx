'use client';

import { useAppStore } from '@/store/useAppStore';
import { useMemo } from 'react';
import { useStockTransactionsQuery, useNseQuoteQuery } from '@/api/query/stocks';
import {
  useMutualFundInfoFetchQuery,
  useMfapiNavHistoryBatchQuery,
} from '@/api/query/mutual-funds-info';
import { useMutualFundTransactionsQuery } from '@/api/query/mutual-funds';
import { useSafeGoldRatesQuery, useGoldTransactionsQuery } from '@/api/query/gold';
import { useCryptoTransactionsQuery, useCryptoCoinPricesQuery } from '@/api/query/crypto';
import { Skeleton } from '@/components/ui/skeleton';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { Card } from '@/components/ui/card';
import _ from 'lodash';
import xirr, { XirrTransaction as XirrCashFlow } from '@/utils/xirr';
import { formatToPercentage, formatToTwoDecimals } from '@/utils/numbers';
import dynamic from 'next/dynamic';

// Type definitions
interface CryptoPortfolioItem {
  coinName: string;
  currency: string;
  balance: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

// Helper functions
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);

const formatPercentage = (percentage: number) =>
  `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;

const getProfitLossColor = (profitLoss: number) =>
  profitLoss >= 0 ? 'text-green-600' : 'text-red-600';

export default function Home() {
  const user = useAppStore((state) => state.user);

  // ===== STOCKS DATA =====
  const { data: stockTransactions, isLoading: stockTransactionsLoading } =
    useStockTransactionsQuery();

  // Group and aggregate stock data by stockName
  const stockGroupedRows = useMemo(() => {
    if (!stockTransactions) return [];
    const grouped = _.groupBy(stockTransactions, 'stockName');
    return Object.entries(grouped).map(([stockName, group]) => {
      const txs = group as typeof stockTransactions;
      const totalShares = txs.reduce(
        (sum: number, tx: (typeof txs)[0]) => sum + (tx.numOfShares ?? 0),
        0
      );
      const totalAmount = txs.reduce(
        (sum: number, tx: (typeof txs)[0]) => sum + (tx.amount ?? 0),
        0
      );
      const avgAmount = totalShares > 0 ? formatToTwoDecimals(totalAmount / totalShares) : 0;
      return {
        stockName,
        numOfShares: totalShares,
        avgPrice: avgAmount.toFixed(2),
      };
    });
  }, [stockTransactions]);

  // Fetch NSE data for stocks
  const stockNames = stockGroupedRows.map((row) => row.stockName).filter(Boolean);
  const { data: nseQuoteData, isLoading: nseQuoteLoading } = useNseQuoteQuery(stockNames);

  // Process stock portfolio data
  const stockPortfolioData = useMemo(() => {
    if (!stockGroupedRows.length) return [];

    return stockGroupedRows.map((row) => {
      const stockData = nseQuoteData?.[row.stockName];
      const currentPrice = stockData?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const currentValuation = currentPrice ? currentPrice * row.numOfShares : 0;
      const investedAmount = parseFloat(row.avgPrice) * row.numOfShares;
      const profitLoss = currentValuation - investedAmount;
      const profitLossPercentage =
        investedAmount > 0 ? formatToPercentage(profitLoss, investedAmount) : 0;

      return {
        ...row,
        currentPrice: currentPrice || 0,
        currentValuation,
        investedAmount,
        profitLoss,
        profitLossPercentage,
        isDataAvailable: !!currentPrice,
      };
    });
  }, [stockGroupedRows, nseQuoteData]);

  // ===== MUTUAL FUNDS DATA =====
  const { data: mfInfoData, isLoading: mfInfoLoading } = useMutualFundInfoFetchQuery();
  const { data: mutualFundsTransactionsData, isLoading: mfTransactionsLoading } =
    useMutualFundTransactionsQuery();

  // Get unique schemeNumbers
  const schemeNumbers = useMemo(() => {
    if (!mfInfoData) return [];
    return Array.from(new Set(mfInfoData.map((info) => info.schemeNumber)));
  }, [mfInfoData]);

  // Fetch NAV data for mutual funds
  const { data: navHistoryBatch, isLoading: navHistoryLoading } =
    useMfapiNavHistoryBatchQuery(schemeNumbers);

  // Build navDataMap from batch query
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

  // Group mutual fund transactions by fundName
  const mfGrouped = useMemo(() => {
    if (!mutualFundsTransactionsData) return {};
    return _.groupBy(mutualFundsTransactionsData, 'fundName');
  }, [mutualFundsTransactionsData]);

  // Process mutual fund portfolio data
  const mfPortfolioData = useMemo(() => {
    if (!mutualFundsTransactionsData || !mfInfoData) return [];
    return Object.entries(mfGrouped).map(([fundName, txs]) => {
      const totalUnits = txs.reduce((sum, tx) => sum + tx.numOfUnits, 0);
      const totalInvested = txs.reduce((sum, tx) => sum + tx.amount, 0);
      // Find schemeNumber for this fundName
      const info = mfInfoData.find((info) => info.fundName === fundName);
      const schemeNumber = info?.schemeNumber;
      const navInfo = schemeNumber ? navDataMap[schemeNumber] : null;
      const currentNav = navInfo ? navInfo.nav : null;
      const currentValue = currentNav !== null ? totalUnits * currentNav : null;
      const profitLoss = currentValue !== null ? currentValue - totalInvested : null;
      const profitLossPercentage =
        profitLoss !== null && totalInvested > 0 ? (profitLoss / totalInvested) * 100 : null;

      return {
        fundName,
        totalUnits,
        totalInvested,
        currentNav,
        currentValue,
        profitLoss,
        profitLossPercentage,
      };
    });
  }, [mfGrouped, mfInfoData, mutualFundsTransactionsData, navDataMap]);

  // ===== GOLD DATA =====
  const { data: goldTransactions, isLoading: goldTransactionsLoading } = useGoldTransactionsQuery();

  // Get current gold rate (fetch yesterday and today for current rate)
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // Yesterday
  const { data: goldRatesData, isLoading: goldRatesLoading } = useSafeGoldRatesQuery({
    startDate,
    endDate,
  });

  // Gold portfolio calculations
  const goldPortfolioData = useMemo(() => {
    if (!goldTransactions) return [];

    const totalGold = goldTransactions.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.quantity : -tx.quantity),
      0
    );
    const totalInvested = goldTransactions.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.amount : -tx.amount),
      0
    );

    // Get current gold rate from the fetched data
    let currentGoldRate = 0;
    if (goldRatesData?.data && goldRatesData.data.length > 0) {
      // Use the latest available rate (last entry in the array)
      currentGoldRate = parseFloat(goldRatesData.data[goldRatesData.data.length - 1].rate);
    }

    const currentValue = totalGold * currentGoldRate;
    const profitLoss = currentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return [
      {
        totalGold,
        totalInvested,
        currentValue,
        profitLoss,
        profitLossPercentage,
        currentGoldRate,
      },
    ];
  }, [goldTransactions, goldRatesData]);

  // ===== CRYPTO DATA =====
  const { data: cryptoTransactions, isLoading: cryptoTransactionsLoading } =
    useCryptoTransactionsQuery();

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

  const { data: coinPrices, isLoading: cryptoPricesLoading } = useCryptoCoinPricesQuery(validCoins);

  const cryptoPortfolioData = useMemo(() => {
    if (!coinPrices?.data) return [];

    const portfolioItems: CryptoPortfolioItem[] = [];

    validCoins.forEach((coinSymbol) => {
      const coinName = cryptoInvestedMap[coinSymbol]?.coinName;
      const currentPrice = coinPrices.data[coinSymbol] || 0;
      const investedAmount = cryptoInvestedMap[coinSymbol]?.invested || 0;
      const units = cryptoInvestedMap[coinSymbol]?.units || 0;
      const currentValue = units * (currentPrice || 0);
      const profitLoss = currentValue - investedAmount;
      const profitLossPercentage = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;

      portfolioItems.push({
        coinName,
        currency: coinSymbol,
        balance: units,
        currentPrice: currentPrice,
        investedAmount: investedAmount,
        currentValue: currentValue,
        profitLoss: profitLoss,
        profitLossPercentage: profitLossPercentage,
      });
    });

    return portfolioItems;
  }, [coinPrices, cryptoInvestedMap, validCoins]);

  // ===== AGGREGATE PORTFOLIO SUMMARY =====
  const portfolioSummary = useMemo(() => {
    // Stocks summary
    const stockTotalInvested = stockPortfolioData.reduce(
      (sum, stock) => sum + stock.investedAmount,
      0
    );
    const stockTotalCurrentValue = stockPortfolioData.reduce(
      (sum, stock) => sum + stock.currentValuation,
      0
    );
    const stockTotalProfitLoss = stockTotalCurrentValue - stockTotalInvested;

    // Mutual funds summary
    const mfTotalInvested = mfPortfolioData.reduce((sum, fund) => sum + fund.totalInvested, 0);
    const mfTotalCurrentValue = mfPortfolioData.reduce(
      (sum, fund) => sum + (fund.currentValue ?? 0),
      0
    );
    const mfTotalProfitLoss = mfTotalCurrentValue - mfTotalInvested;

    // Gold summary
    const goldTotalInvested = goldPortfolioData.reduce((sum, gold) => sum + gold.totalInvested, 0);
    const goldTotalCurrentValue = goldPortfolioData.reduce(
      (sum, gold) => sum + gold.currentValue,
      0
    );
    const goldTotalProfitLoss = goldTotalCurrentValue - goldTotalInvested;

    // Crypto summary
    const cryptoTotalInvested = cryptoPortfolioData.reduce(
      (sum, coin) => sum + coin.investedAmount,
      0
    );
    const cryptoTotalCurrentValue = cryptoPortfolioData.reduce(
      (sum, coin) => sum + coin.currentValue,
      0
    );
    const cryptoTotalProfitLoss = cryptoTotalCurrentValue - cryptoTotalInvested;

    // Overall totals
    const totalInvested =
      stockTotalInvested + mfTotalInvested + goldTotalInvested + cryptoTotalInvested;
    const totalCurrentValue =
      stockTotalCurrentValue +
      mfTotalCurrentValue +
      goldTotalCurrentValue +
      cryptoTotalCurrentValue;
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercentage =
      totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      stocks: {
        invested: stockTotalInvested,
        currentValue: stockTotalCurrentValue,
        profitLoss: stockTotalProfitLoss,
        profitLossPercentage:
          stockTotalInvested > 0 ? (stockTotalProfitLoss / stockTotalInvested) * 100 : 0,
      },
      mutualFunds: {
        invested: mfTotalInvested,
        currentValue: mfTotalCurrentValue,
        profitLoss: mfTotalProfitLoss,
        profitLossPercentage: mfTotalInvested > 0 ? (mfTotalProfitLoss / mfTotalInvested) * 100 : 0,
      },
      gold: {
        invested: goldTotalInvested,
        currentValue: goldTotalCurrentValue,
        profitLoss: goldTotalProfitLoss,
        profitLossPercentage:
          goldTotalInvested > 0 ? (goldTotalProfitLoss / goldTotalInvested) * 100 : 0,
      },
      crypto: {
        invested: cryptoTotalInvested,
        currentValue: cryptoTotalCurrentValue,
        profitLoss: cryptoTotalProfitLoss,
        profitLossPercentage:
          cryptoTotalInvested > 0 ? (cryptoTotalProfitLoss / cryptoTotalInvested) * 100 : 0,
      },
      total: {
        invested: totalInvested,
        currentValue: totalCurrentValue,
        profitLoss: totalProfitLoss,
        profitLossPercentage: totalProfitLossPercentage,
      },
    };
  }, [stockPortfolioData, mfPortfolioData, goldPortfolioData, cryptoPortfolioData]);

  // ===== XIRR CALCULATIONS =====
  const stockXirr = useMemo(() => {
    if (!stockTransactions || stockPortfolioData.length === 0) return null;
    const cashFlows: XirrCashFlow[] = stockTransactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    // Add current stock portfolio value as final positive cash flow
    const stockCurrentValue = stockPortfolioData.reduce(
      (sum, stock) => sum + stock.currentValuation,
      0
    );
    if (stockCurrentValue > 0) {
      cashFlows.push({ amount: stockCurrentValue, when: new Date() });
    }
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [stockTransactions, stockPortfolioData]);

  const mfXirr = useMemo(() => {
    if (!mutualFundsTransactionsData || mfPortfolioData.length === 0) return null;
    const cashFlows: XirrCashFlow[] = mutualFundsTransactionsData.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    // Add current mutual fund portfolio value as final positive cash flow
    const mfCurrentValue = mfPortfolioData.reduce((sum, fund) => sum + (fund.currentValue ?? 0), 0);
    if (mfCurrentValue > 0) {
      cashFlows.push({ amount: mfCurrentValue, when: new Date() });
    }
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [mutualFundsTransactionsData, mfPortfolioData]);

  const goldXirr = useMemo(() => {
    if (!goldTransactions || goldPortfolioData.length === 0) return null;
    const cashFlows: XirrCashFlow[] = goldTransactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    // Add current gold portfolio value as final positive cash flow
    const goldCurrentValue = goldPortfolioData.reduce((sum, gold) => sum + gold.currentValue, 0);
    if (goldCurrentValue > 0) {
      cashFlows.push({ amount: goldCurrentValue, when: new Date() });
    }
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [goldTransactions, goldPortfolioData]);

  const cryptoXirr = useMemo(() => {
    if (!cryptoTransactions || cryptoPortfolioData.length === 0) return null;
    const cashFlows: XirrCashFlow[] = cryptoTransactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    // Add current crypto portfolio value as final positive cash flow
    const cryptoCurrentValue = cryptoPortfolioData.reduce(
      (sum, coin) => sum + coin.currentValue,
      0
    );
    if (cryptoCurrentValue > 0) {
      cashFlows.push({ amount: cryptoCurrentValue, when: new Date() });
    }
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [cryptoTransactions, cryptoPortfolioData]);

  // ===== OVERALL XIRR CALCULATION =====
  const overallXirr = useMemo(() => {
    const allCashFlows: XirrCashFlow[] = [];

    // Add stock transactions
    if (stockTransactions) {
      stockTransactions.forEach((tx) => {
        allCashFlows.push({
          amount: tx.type === 'credit' ? -tx.amount : tx.amount,
          when: new Date(tx.date),
        });
      });
    }

    // Add mutual fund transactions
    if (mutualFundsTransactionsData) {
      mutualFundsTransactionsData.forEach((tx) => {
        allCashFlows.push({
          amount: tx.type === 'credit' ? -tx.amount : tx.amount,
          when: new Date(tx.date),
        });
      });
    }

    // Add gold transactions
    if (goldTransactions) {
      goldTransactions.forEach((tx) => {
        allCashFlows.push({
          amount: tx.type === 'credit' ? -tx.amount : tx.amount,
          when: new Date(tx.date),
        });
      });
    }

    // Add crypto transactions
    if (cryptoTransactions) {
      cryptoTransactions.forEach((tx) => {
        allCashFlows.push({
          amount: tx.type === 'credit' ? -tx.amount : tx.amount,
          when: new Date(tx.date),
        });
      });
    }

    // Add current portfolio value as final positive cash flow
    if (portfolioSummary.total.currentValue > 0) {
      allCashFlows.push({
        amount: portfolioSummary.total.currentValue,
        when: new Date(),
      });
    }

    // Calculate XIRR
    if (allCashFlows.length > 1) {
      try {
        return xirr(allCashFlows) * 100;
      } catch {
        return null;
      }
    }

    return null;
  }, [
    stockTransactions,
    mutualFundsTransactionsData,
    goldTransactions,
    cryptoTransactions,
    portfolioSummary.total.currentValue,
  ]);

  const Chart = dynamic(() => import('./Chart'), { ssr: false });

  // Prepare data for chart
  const polarCategories = ['Stocks', 'Mutual Funds', 'Gold', 'Crypto'];
  const investedData = [
    portfolioSummary.stocks.invested,
    portfolioSummary.mutualFunds.invested,
    portfolioSummary.gold.invested,
    portfolioSummary.crypto.invested,
  ];
  const currentValueData = [
    portfolioSummary.stocks.currentValue,
    portfolioSummary.mutualFunds.currentValue,
    portfolioSummary.gold.currentValue,
    portfolioSummary.crypto.currentValue,
  ];

  // Loading states
  const isLoading =
    stockTransactionsLoading ||
    nseQuoteLoading ||
    mfInfoLoading ||
    mfTransactionsLoading ||
    navHistoryLoading ||
    goldTransactionsLoading ||
    goldRatesLoading ||
    cryptoTransactionsLoading ||
    cryptoPricesLoading;

  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Portfolio Dashboard</h2>
        {/* Top: Summary Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[120px]" />
        </div>
        {/* Below: Chart and Portfolio Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex items-stretch">
            <Skeleton className="w-full h-[400px]" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="w-full h-[300px]" />
            <Skeleton className="w-full h-[300px]" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="w-full h-[300px]" />
            <Skeleton className="w-full h-[300px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">Portfolio Dashboard</h2>
      {/* Top: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <SummaryStatCard
          label="Total Invested"
          value={formatCurrency(portfolioSummary.total.invested)}
        />
        <SummaryStatCard
          label={
            <>
              Total Current Value{' '}
              <span className={getProfitLossColor(portfolioSummary.total.profitLoss)}>
                ({formatCurrency(portfolioSummary.total.profitLoss)})
              </span>
            </>
          }
          value={
            <span className={getProfitLossColor(portfolioSummary.total.profitLoss)}>
              {formatCurrency(portfolioSummary.total.currentValue)}{' '}
              <span>({formatPercentage(portfolioSummary.total.profitLossPercentage)})</span>
            </span>
          }
          valueClassName={getProfitLossColor(portfolioSummary.total.profitLoss)}
        />
        <SummaryStatCard
          label="Total P&L %"
          value={formatPercentage(portfolioSummary.total.profitLossPercentage)}
          valueClassName={getProfitLossColor(portfolioSummary.total.profitLoss)}
        />
        <SummaryStatCard
          label="Overall XIRR %"
          value={overallXirr !== null ? `${overallXirr.toFixed(2)}%` : 'N/A'}
          valueClassName={
            overallXirr !== null && overallXirr >= 0 ? 'text-green-600' : 'text-red-600'
          }
        />
      </div>
      {/* Below: Chart and Portfolio Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Left: Chart */}
        <div className="flex items-stretch">
          <div
            className={
              'bg-card rounded-lg p-4 w-full flex items-center justify-center h-full border shadow-sm'
            }
          >
            <Chart
              investedData={investedData}
              currentValueData={currentValueData}
              categories={polarCategories}
            />
          </div>
        </div>
        {/* Middle: Stocks & Gold */}
        <div className="flex flex-col gap-6">
          {/* Stocks Portfolio */}
          <Card className="p-6 flex-1">
            <h3 className="text-lg font-semibold mb-1">Stocks Portfolio</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Invested:</span>
                <span>{formatCurrency(portfolioSummary.stocks.invested)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Value:</span>
                <span className={getProfitLossColor(portfolioSummary.stocks.profitLoss)}>
                  {formatCurrency(portfolioSummary.stocks.currentValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>P&L:</span>
                <span className={getProfitLossColor(portfolioSummary.stocks.profitLoss)}>
                  {formatCurrency(portfolioSummary.stocks.profitLoss)} (
                  {formatPercentage(portfolioSummary.stocks.profitLossPercentage)})
                </span>
              </div>
              <div className="flex justify-between">
                <span>XIRR:</span>
                <span
                  className={
                    stockXirr !== null && stockXirr >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {stockXirr !== null ? `${stockXirr.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </Card>
          {/* Gold Portfolio */}
          <Card className="p-6 flex-1">
            <h3 className="text-lg font-semibold mb-1">Gold Portfolio</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Invested:</span>
                <span>{formatCurrency(portfolioSummary.gold.invested)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Value:</span>
                <span className={getProfitLossColor(portfolioSummary.gold.profitLoss)}>
                  {formatCurrency(portfolioSummary.gold.currentValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>P&L:</span>
                <span className={getProfitLossColor(portfolioSummary.gold.profitLoss)}>
                  {formatCurrency(portfolioSummary.gold.profitLoss)} (
                  {formatPercentage(portfolioSummary.gold.profitLossPercentage)})
                </span>
              </div>
              <div className="flex justify-between">
                <span>XIRR:</span>
                <span
                  className={goldXirr !== null && goldXirr >= 0 ? 'text-green-600' : 'text-red-600'}
                >
                  {goldXirr !== null ? `${goldXirr.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </Card>
        </div>
        {/* Right: Mutual Funds & Crypto */}
        <div className="flex flex-col gap-6">
          {/* Mutual Funds Portfolio */}
          <Card className="p-6 flex-1">
            <h3 className="text-lg font-semibold mb-1">Mutual Funds Portfolio</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Invested:</span>
                <span>{formatCurrency(portfolioSummary.mutualFunds.invested)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Value:</span>
                <span className={getProfitLossColor(portfolioSummary.mutualFunds.profitLoss)}>
                  {formatCurrency(portfolioSummary.mutualFunds.currentValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>P&L:</span>
                <span className={getProfitLossColor(portfolioSummary.mutualFunds.profitLoss)}>
                  {formatCurrency(portfolioSummary.mutualFunds.profitLoss)} (
                  {formatPercentage(portfolioSummary.mutualFunds.profitLossPercentage)})
                </span>
              </div>
              <div className="flex justify-between">
                <span>XIRR:</span>
                <span
                  className={mfXirr !== null && mfXirr >= 0 ? 'text-green-600' : 'text-red-600'}
                >
                  {mfXirr !== null ? `${mfXirr.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </Card>
          {/* Crypto Portfolio */}
          <Card className="p-6 flex-1">
            <h3 className="text-lg font-semibold mb-1">Crypto Portfolio</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Invested:</span>
                <span>{formatCurrency(portfolioSummary.crypto.invested)}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Value:</span>
                <span className={getProfitLossColor(portfolioSummary.crypto.profitLoss)}>
                  {formatCurrency(portfolioSummary.crypto.currentValue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>P&L:</span>
                <span className={getProfitLossColor(portfolioSummary.crypto.profitLoss)}>
                  {formatCurrency(portfolioSummary.crypto.profitLoss)} (
                  {formatPercentage(portfolioSummary.crypto.profitLossPercentage)})
                </span>
              </div>
              <div className="flex justify-between">
                <span>XIRR:</span>
                <span
                  className={
                    cryptoXirr !== null && cryptoXirr >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {cryptoXirr !== null ? `${cryptoXirr.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
      {/* Quick Stats */}
      <div className="text-center text-muted-foreground">
        <p>Welcome back, {user}! Your comprehensive portfolio overview is ready.</p>
        <p className="text-sm mt-2">
          Total Assets: {stockPortfolioData.length} Stocks • {mfPortfolioData.length} Mutual Funds •{' '}
          {goldPortfolioData.length} Gold • {cryptoPortfolioData.length} Crypto
        </p>
      </div>
    </div>
  );
}
