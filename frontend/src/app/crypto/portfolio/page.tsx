'use client';

import { useCryptoCoinPricesQuery, useCryptoTransactionsQuery } from '@/api/query';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useEffect, useMemo, useState } from 'react';
import groupBy from 'lodash/groupBy';
import xirr, { XirrTransaction as XirrCashFlow } from '@/utils/xirr';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { PerformerStatCard } from '@/components/custom/PerformerStatCard';
import { Card } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import Highcharts from 'highcharts';
import { useAppStore } from '@/store/useAppStore';
import { useCoinCandlesQuery } from '@/api/query/crypto';
import { CryptoTransaction, CoinCandle } from '@/api/dataInterface';
import { formatCurrency, formatToPercentage } from '@/utils/numbers';
import { getProfitLossColor } from '@/utils/text';

interface PortfolioItem {
  coinName: string;
  currency: string;
  balance: number;
  currentPrice: number | null;
  investedAmount: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

function getPeriodPerformance(candles: CoinCandle[], days: number) {
  if (!candles.length) {
    return { change: 0, high: 0, low: 0 };
  }
  const periodCandles = candles.slice(-days);
  if (periodCandles.length < 2) {
    return { change: 0, high: 0, low: 0 };
  }
  const first = periodCandles[0].close;
  const last = periodCandles[periodCandles.length - 1].close;
  const high = Math.max(...periodCandles.map((c) => c.high));
  const low = Math.min(...periodCandles.map((c) => c.low));
  const change = ((last - first) / first) * 100;
  return { change, high, low };
}

const HighchartsReact = dynamic(() => import('highcharts-react-official'), { ssr: false });

export default function CryptoPortfolioPage() {
  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useCryptoTransactionsQuery();

  const investedMap = useMemo(() => {
    if (!transactions) return {};
    const grouped = groupBy(
      transactions,
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
  }, [transactions]);

  const validCoins = useMemo(() => {
    return Object.entries(investedMap)
      .filter(([, v]) => v.units > 0)
      .map(([symbol]) => symbol);
  }, [investedMap]);

  const {
    data: coinPrices,
    isLoading: pricesLoading,
    error: pricesError,
  } = useCryptoCoinPricesQuery(validCoins);

  const portfolioData = useMemo(() => {
    if (!coinPrices?.data) return [];

    const portfolioItems: PortfolioItem[] = [];

    validCoins.forEach((coinSymbol) => {
      const coinName = investedMap[coinSymbol]?.coinName;
      const currentPrice = coinPrices.data[coinSymbol] || 0;
      const investedAmount = investedMap[coinSymbol]?.invested || 0;
      const units = investedMap[coinSymbol]?.units || 0;
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
  }, [coinPrices, investedMap, validCoins]);

  const summary = useMemo(() => {
    const totalInvested = portfolioData.reduce((sum, item) => sum + item.investedAmount, 0);
    const totalCurrentValue = portfolioData.reduce((sum, item) => sum + item.currentValue, 0);
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercentage =
      totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercentage,
    };
  }, [portfolioData]);

  const cashFlows: XirrCashFlow[] = useMemo(() => {
    if (!transactions) return [];
    const grouped: { [date: string]: number } = {};
    transactions.forEach((tx) => {
      const dateStr = new Date(tx.date).toISOString().slice(0, 10);
      const amt = tx.type === 'credit' ? -tx.amount : tx.amount;
      grouped[dateStr] = (grouped[dateStr] || 0) + amt;
    });
    const flows: XirrCashFlow[] = Object.entries(grouped).map(([date, amount]) => ({
      amount,
      when: new Date(date),
    }));

    flows.push({
      amount: Number(summary.totalCurrentValue.toFixed(2)),
      when: new Date(),
    });
    return flows;
  }, [transactions, summary.totalCurrentValue]);

  const xirrValue = useMemo(() => {
    if (!cashFlows.length) return null;
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [cashFlows]);

  const getProfitLossBadgeVariant = (profitLoss: number) => {
    return profitLoss >= 0 ? 'default' : 'destructive';
  };

  const bestPerformer = useMemo(() => {
    if (!portfolioData.length) return null;
    return portfolioData.reduce((best, item) =>
      item.profitLossPercentage > best.profitLossPercentage ? item : best
    );
  }, [portfolioData]);

  const worstPerformer = useMemo(() => {
    if (!portfolioData.length) return null;
    return portfolioData.reduce((worst, item) =>
      item.profitLossPercentage < worst.profitLossPercentage ? item : worst
    );
  }, [portfolioData]);

  // For sparkline, use last 30 days of candle data if available, else fallback to useCoinPriceHistory
  const bestHistoryCandles = useCoinCandlesQuery(bestPerformer?.currency ?? '', '1d', 30).data;
  const worstHistoryCandles = useCoinCandlesQuery(worstPerformer?.currency ?? '', '1d', 30).data;

  const bestHistory = useMemo(() => {
    if (bestHistoryCandles && bestHistoryCandles.length > 0) {
      return bestHistoryCandles.map((c) => ({ x: c.time, y: c.close }));
    }
    return [];
  }, [bestHistoryCandles]);

  const worstHistory = useMemo(() => {
    if (worstHistoryCandles && worstHistoryCandles.length > 0) {
      return worstHistoryCandles.map((c) => ({ x: c.time, y: c.close }));
    }
    return [];
  }, [worstHistoryCandles]);

  const { data: bestCandles } = useCoinCandlesQuery(bestPerformer?.currency ?? '', '1d', 7);
  const { data: worstCandles } = useCoinCandlesQuery(worstPerformer?.currency ?? '', '1d', 7);

  const [bestWeek, setBestWeek] = useState<{ change: number; high: number; low: number } | null>(
    null
  );
  const [worstWeek, setWorstWeek] = useState<{ change: number; high: number; low: number } | null>(
    null
  );

  useEffect(() => {
    if (bestCandles && bestCandles.length > 0) {
      setBestWeek(getPeriodPerformance(bestCandles, 7));
    } else {
      setBestWeek(null);
    }
  }, [bestCandles]);

  useEffect(() => {
    if (worstCandles && worstCandles.length > 0) {
      setWorstWeek(getPeriodPerformance(worstCandles, 7));
    } else {
      setWorstWeek(null);
    }
  }, [worstCandles]);

  const theme = useAppStore((state) => state.theme);

  // Pie chart data for invested amount per coin
  const pieData = useMemo(
    () =>
      portfolioData.map((item) => ({
        name: item.currency,
        y: item.investedAmount,
        coinName: item.coinName,
      })),
    [portfolioData]
  );

  // Highcharts does not export TooltipFormatterContextObject in all builds, so use 'any' for formatter context
  // See PerformerStatCard.tsx for similar usage
  const pieOptions = useMemo(
    () => ({
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        height: 200,
        spacing: [0, 0, 0, 0],
        plotBackgroundColor: 'transparent',
        plotBorderWidth: 0,
        plotShadow: false,
      },
      title: {
        text: 'Investment Distribution',
        style: {
          color: theme === 'dark' ? '#fff' : '#18181b',
          fontWeight: 600,
          fontSize: '1rem',
        },
      },
      tooltip: {
        useHTML: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (this: any) {
          const isDark = document.documentElement.classList.contains('dark');
          const textColor = isDark ? '#fff' : '#18181b';
          const subTextColor = isDark ? '#a3a3a3' : '#52525b';
          return `
            <div style="font-family:inherit;">
              <div style="font-weight:600;font-size:1.1em;color:${textColor};margin-bottom:2px;">
                ${this.point.coinName || this.point.name}
              </div>
              <div style="font-weight:700;font-size:1.2em;color:${textColor};">
                ${Highcharts.numberFormat(this.point.percentage, 1)}%
                <span style="font-weight:400;font-size:0.95em;color:${subTextColor};margin-left:4px;">
                  (${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(this.point.y)})
                </span>
              </div>
            </div>
          `;
        },
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          borderWidth: 0,
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
            style: {
              color: theme === 'dark' ? '#fff' : '#18181b',
              fontWeight: 500,
              textOutline: 'none',
            },
          },
        },
      },
      series: [
        {
          name: 'Invested',
          colorByPoint: true,
          data: pieData,
        },
      ],
      credits: { enabled: false },
      legend: {
        backgroundColor: 'transparent',
        itemStyle: {
          fontWeight: 400,
        },
      },
    }),
    [pieData, theme]
  );

  const isLoading = transactionsLoading || pricesLoading;
  const error = transactionsError || pricesError;

  if (isLoading) {
    return (
      <div className="p-4 h-full">
        <div className="text-center">Loading portfolio data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 h-full">
        <div className="text-red-500 text-center">Error loading portfolio data</div>
      </div>
    );
  }

  // Find all transactions for a given coin
  function getCoinTransactions(coin: string) {
    if (!transactions) return [];
    return transactions.filter(
      (tx: CryptoTransaction) =>
        (tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase()) === coin
    );
  }

  return (
    <div className="p-4 h-full">
      <h2 className="text-xl font-bold mb-6 text-center">Crypto Portfolio</h2>

      {/* Portfolio Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-2 mb-6 mx-9 place-items-stretch">
          <SummaryStatCard label="Total Invested" value={formatCurrency(summary.totalInvested)} />

          {/* Merged Current Value + Total P&L Card */}
          <SummaryStatCard
            label={
              <>
                {summary.totalProfitLoss >= 0 ? 'Current Profit' : 'Current Loss'}{' '}
                <span className={getProfitLossColor(summary.totalProfitLoss)}>
                  ({formatCurrency(summary.totalProfitLoss)})
                </span>
              </>
            }
            value={
              <span className={getProfitLossColor(summary.totalProfitLoss)}>
                {formatCurrency(summary.totalCurrentValue)}{' '}
                <span>({formatToPercentage(summary.totalProfitLossPercentage)})</span>
              </span>
            }
            valueClassName={getProfitLossColor(summary.totalProfitLoss)}
          />

          <SummaryStatCard
            label="XIRR %"
            value={xirrValue !== null ? `${xirrValue.toFixed(2)}%` : 'N/A'}
            valueClassName={
              xirrValue !== null && xirrValue >= 0 ? 'text-green-600' : 'text-red-600'
            }
          />

          {bestPerformer && (
            <PerformerStatCard
              label="Best Performer"
              performer={bestPerformer}
              history={bestHistory}
              weekStats={bestWeek}
              color="green"
              symbol={bestPerformer.currency}
            />
          )}

          {worstPerformer && (
            <PerformerStatCard
              label="Worst Performer"
              performer={worstPerformer}
              history={worstHistory}
              weekStats={worstWeek}
              color="red"
              symbol={worstPerformer.currency}
            />
          )}

          {/* Pie Chart Card */}
          <Card className="w-full min-w-[180px] flex flex-col items-center justify-center py-8 min-h-[180px]">
            <div
              className="w-full flex flex-col items-center"
              style={{ height: 220, minHeight: 180 }}
            >
              <HighchartsReact
                highcharts={Highcharts}
                options={pieOptions}
                containerProps={{ style: { width: '100%', height: '100%' } }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Portfolio Table */}
      {portfolioData.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.No</TableHead>
                <TableHead>Coin Name</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Avg Price (₹)</TableHead>
                <TableHead>Current Price (₹)</TableHead>
                <TableHead>Invested Amount (₹)</TableHead>
                <TableHead>Current Value (₹)</TableHead>
                <TableHead>P&L (₹)</TableHead>
                <TableHead>P&L %</TableHead>
                <TableHead>XIRR %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolioData.map((item, idx) => {
                // Per-coin XIRR calculation
                const coinTxs = getCoinTransactions(item.currency.toUpperCase());
                let coinXirr: number | null = null;
                if (coinTxs.length > 0) {
                  const cashFlows: XirrCashFlow[] = coinTxs.map((tx) => ({
                    amount: tx.type === 'credit' ? -tx.amount : tx.amount,
                    when: new Date(tx.date),
                  }));
                  // Add current value as final positive cash flow
                  cashFlows.push({ amount: item.currentValue, when: new Date() });
                  try {
                    coinXirr = xirr(cashFlows) * 100;
                  } catch {
                    coinXirr = null;
                  }
                }
                return (
                  <TableRow key={item.currency || idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{item.coinName}</TableCell>
                    <TableCell>{item.balance.toFixed(6)}</TableCell>
                    <TableCell>
                      {item.balance > 0
                        ? formatCurrency(Number((item.investedAmount / item.balance).toFixed(2)))
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.currentPrice ? formatCurrency(item.currentPrice) : 'N/A'}
                    </TableCell>
                    <TableCell>{formatCurrency(item.investedAmount)}</TableCell>
                    <TableCell>{formatCurrency(item.currentValue)}</TableCell>
                    <TableCell className={getProfitLossColor(item.profitLoss)}>
                      {formatCurrency(item.profitLoss)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getProfitLossBadgeVariant(item.profitLoss)}>
                        {formatToPercentage(item.profitLossPercentage)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {coinXirr !== null ? (
                        <Badge variant={coinXirr >= 0 ? 'default' : 'destructive'}>
                          {coinXirr.toFixed(2)}%
                        </Badge>
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

      {portfolioData.length === 0 && (
        <div className="text-center text-muted-foreground">
          No crypto investments found. Add some transactions to see your portfolio.
        </div>
      )}
    </div>
  );
}
