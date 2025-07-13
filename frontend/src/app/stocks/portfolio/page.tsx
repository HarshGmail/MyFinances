'use client';

import { useStockTransactionsQuery, useNseQuoteQuery } from '@/api/query/stocks';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import _ from 'lodash';
import { useMemo } from 'react';
import { formatToPercentage, formatToTwoDecimals } from '@/utils/numbers';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import xirr, { XirrTransaction as XirrCashFlow } from '@/utils/xirr';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function StocksPortfolioPage() {
  // Fetch stock transactions
  const {
    data: stockTransactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useStockTransactionsQuery();

  // Group and aggregate data by stockName
  const groupedRows = useMemo(() => {
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

  // Fetch NSE data for all stock names in groupedRows using the new backend API
  const stockNames = groupedRows.map((row) => row.stockName).filter(Boolean);
  const {
    data: nseQuoteData,
    isLoading: nseQuoteLoading,
    error: nseQuoteError,
  } = useNseQuoteQuery(stockNames);

  // Process data with current prices and valuations
  const processedPortfolioData = useMemo(() => {
    if (!groupedRows.length) return [];

    return groupedRows.map((row) => {
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
  }, [groupedRows, nseQuoteData]);

  // Calculate portfolio totals
  const portfolioTotals = useMemo(() => {
    const totalInvested = processedPortfolioData.reduce(
      (sum, stock) => sum + stock.investedAmount,
      0
    );
    const totalCurrentValue = processedPortfolioData.reduce(
      (sum, stock) => sum + stock.currentValuation,
      0
    );
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercentage =
      totalInvested > 0 ? formatToPercentage(totalProfitLoss, totalInvested) : 0;

    return {
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercentage,
    };
  }, [processedPortfolioData]);

  // Calculate overall portfolio XIRR
  const allStockTxs = useMemo(() => {
    if (!stockTransactions) return [];
    return stockTransactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
  }, [stockTransactions]);

  const overallXirr = useMemo(() => {
    if (!allStockTxs.length) return null;
    const cashFlows = [...allStockTxs];
    // Add current portfolio value as final positive cash flow
    cashFlows.push({ amount: portfolioTotals.totalCurrentValue, when: new Date() });
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [allStockTxs, portfolioTotals.totalCurrentValue]);

  // Loading and error states
  const isLoading = transactionsLoading || nseQuoteLoading;
  const error = transactionsError || nseQuoteError;

  if (isLoading) {
    return (
      <div className="p-4 h-full">
        <h2 className="text-xl font-bold mb-4 text-center">Stocks Portfolio</h2>

        {/* Portfolio Summary Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[120px]" />
        </div>

        {/* Portfolio Table Skeleton */}
        <div className="max-w-7xl mx-auto">
          <div className="border rounded-lg">
            {/* Table Header Skeleton */}
            <div className="bg-muted/50 p-4 border-b">
              <div className="grid grid-cols-10 gap-4">
                {[
                  'S.No',
                  'Stock Name',
                  'Shares',
                  'Avg Price',
                  'Amount',
                  'Current Price',
                  'Current Valuation',
                  'P/L (₹)',
                  'P/L %',
                  'XIRR %',
                ].map((header, idx) => (
                  <div key={idx} className="flex items-center">
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Table Body Skeleton */}
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="p-4">
                  <div className="grid grid-cols-10 gap-4">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 h-full">
        <h2 className="text-xl font-bold mb-4 text-center">Stocks Portfolio</h2>
        <div className="text-red-500 text-center">Error loading portfolio data</div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      <h2 className="text-xl font-bold mb-4 text-center">Stocks Portfolio</h2>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {/* Total Invested Card */}
        <SummaryStatCard
          label="Total Invested"
          value={formatCurrency(formatToTwoDecimals(portfolioTotals.totalInvested))}
          loading={isLoading}
        />

        {/* Current Valuation Card */}
        <SummaryStatCard
          label={
            <>
              {portfolioTotals.totalProfitLoss >= 0 ? 'Current Profit' : 'Current Loss'}{' '}
              <span className={getProfitLossColor(portfolioTotals.totalProfitLoss)}>
                ({formatCurrency(formatToTwoDecimals(portfolioTotals.totalProfitLoss))})
              </span>
            </>
          }
          value={
            <span className={getProfitLossColor(portfolioTotals.totalProfitLoss)}>
              {formatCurrency(formatToTwoDecimals(portfolioTotals.totalCurrentValue))}{' '}
              <span>({formatPercentage(portfolioTotals.totalProfitLossPercentage)})</span>
            </span>
          }
          valueClassName={getProfitLossColor(portfolioTotals.totalProfitLoss)}
          loading={isLoading}
        />

        {/* Overall XIRR Card */}
        <SummaryStatCard
          label="XIRR %"
          value={overallXirr !== null ? `${overallXirr.toFixed(2)}%` : 'N/A'}
          valueClassName={
            overallXirr !== null && overallXirr >= 0 ? 'text-green-600' : 'text-red-600'
          }
          loading={isLoading}
        />
      </div>

      {processedPortfolioData.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.No</TableHead>
                <TableHead>Stock Name</TableHead>
                <TableHead>Shares</TableHead>
                <TableHead>Avg Price</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Current Valuation</TableHead>
                <TableHead>P/L (₹)</TableHead>
                <TableHead>P/L %</TableHead>
                <TableHead>XIRR %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedPortfolioData.map((row, idx) => {
                // Find all transactions for this stock
                const stockTxs =
                  stockTransactions?.filter((tx) => tx.stockName === row.stockName) || [];
                let stockXirr: number | null = null;
                if (stockTxs.length > 0) {
                  const cashFlows: XirrCashFlow[] = stockTxs.map((tx) => ({
                    amount: tx.type === 'credit' ? -tx.amount : tx.amount,
                    when: new Date(tx.date),
                  }));
                  // Add current value as final positive cash flow
                  cashFlows.push({ amount: row.currentValuation, when: new Date() });
                  try {
                    stockXirr = xirr(cashFlows) * 100;
                  } catch {
                    stockXirr = null;
                  }
                }
                return (
                  <TableRow key={row.stockName || idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{row.stockName || '-'}</TableCell>
                    <TableCell>{row.numOfShares}</TableCell>
                    <TableCell>{row.avgPrice}</TableCell>
                    <TableCell>₹{row.investedAmount.toFixed(2)}</TableCell>
                    <TableCell>{row.isDataAvailable ? `₹${row.currentPrice}` : '-'}</TableCell>
                    <TableCell>
                      {row.isDataAvailable ? `₹${row.currentValuation.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={getProfitLossColor(row.profitLoss)}>
                        {row.isDataAvailable
                          ? formatCurrency(formatToTwoDecimals(row.profitLoss))
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={getProfitLossColor(row.profitLoss)}>
                        {row.isDataAvailable ? formatPercentage(row.profitLossPercentage) : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {stockXirr !== null ? (
                        <span className={getProfitLossColor(row.profitLoss)}>
                          {stockXirr.toFixed(2)}%
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {processedPortfolioData.length === 0 && (
        <div className="text-center text-muted-foreground">
          No stock investments found. Add some transactions to see your portfolio.
        </div>
      )}
    </div>
  );
}
