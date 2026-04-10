'use client';

import { useStocksPortfolioQuery } from '@/api/query/stocks';
import { useCapitalGainsQuery } from '@/api/query/capitalGains';
import { CapitalGainsSummary } from '@/components/custom/CapitalGainsSummary';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useMemo, useRef, useState } from 'react';
import { formatCurrency, formatToPercentage, formatToTwoDecimals } from '@/utils/numbers';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import xirr, { XirrTransaction as XirrCashFlow } from '@/utils/xirr';
import { Skeleton } from '@/components/ui/skeleton';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAppStore } from '@/store/useAppStore';
import { getTimeframes, getPastDate } from '@/utils/chartHelpers';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProfitLossColor } from '@/utils/text';
import Link from 'next/link';
import { StockTransaction } from '@/api/dataInterface';

export default function StocksPortfolioPage() {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const TIMEFRAMES = getTimeframes('1y');
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[4].label);
  const selectedTimeframe = TIMEFRAMES.find((tf) => tf.label === timeframe) || TIMEFRAMES[1];
  const timeframeStart = getPastDate(selectedTimeframe.days);

  const chartRef = useRef<HTMLDivElement>(null);

  const { data: portfolioData, isLoading, error } = useStocksPortfolioQuery();
  const { data: cgData, isLoading: cgLoading } = useCapitalGainsQuery();

  // All data comes from the single portfolio query — no dependent waterfall
  const processedPortfolioData = useMemo(
    () => portfolioData?.portfolio ?? [],
    [portfolioData?.portfolio]
  );
  const priceData = useMemo(() => portfolioData?.priceData ?? {}, [portfolioData?.priceData]);
  const portfolioTotals = useMemo(
    () =>
      portfolioData?.summary ?? {
        totalInvested: 0,
        totalCurrentValue: 0,
        totalProfitLoss: 0,
        totalProfitLossPercentage: 0,
        totalOneDayChange: 0,
        totalOneDayChangePercentage: 0,
      },
    [portfolioData?.summary]
  );
  const stockTransactions: StockTransaction[] = useMemo(
    () => portfolioData?.transactions ?? [],
    [portfolioData?.transactions]
  );

  // Single combined series: sum all stocks' holding value at each timestamp
  const chartData = useMemo(() => {
    if (!processedPortfolioData.length || !Object.keys(priceData).length) return null;

    const combined = new Map<number, number>();

    processedPortfolioData.forEach((stock) => {
      const stockPriceData = priceData[stock.stockName];
      if (!stockPriceData?.chart?.result?.[0]) return;

      const timestamps: number[] = stockPriceData.chart.result[0].timestamp || [];
      const closes = stockPriceData.chart.result[0].indicators?.quote?.[0]?.close || [];

      timestamps.forEach((ts, idx) => {
        const closePrice = closes[idx];
        const timeMs = ts * 1000;
        if (!closePrice || timeMs < timeframeStart) return;
        combined.set(timeMs, (combined.get(timeMs) ?? 0) + closePrice * stock.numOfShares);
      });
    });

    if (combined.size === 0) return null;

    const seriesData = Array.from(combined.entries())
      .sort(([a], [b]) => a - b)
      .map(([timeMs, value]) => [timeMs, value]);

    return [
      {
        name: 'Portfolio Value',
        data: seriesData,
        color: '#4ECDC4',
        lineWidth: 2,
        marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
      },
    ];
  }, [processedPortfolioData, priceData, timeframeStart]);

  const chartOptions = useMemo(() => {
    if (!chartData) return null;

    return {
      chart: {
        type: 'line',
        height: 500,
        backgroundColor: 'transparent',
        style: { fontFamily: 'inherit' },
      },
      title: {
        text: 'Total Portfolio Value',
        style: { fontSize: '18px', fontWeight: 'bold', color: isDark ? '#fff' : '#374151' },
      },
      subtitle: {
        text: 'All holdings combined, daily',
        style: { color: isDark ? '#d1d5db' : '#6b7280' },
      },
      xAxis: {
        type: 'datetime',
        title: { text: 'Date', style: { color: isDark ? '#fff' : '#374151' } },
        labels: { style: { color: isDark ? '#d1d5db' : '#6b7280' } },
        gridLineWidth: 1,
        gridLineColor: isDark ? '#374151' : '#e5e7eb',
        lineColor: isDark ? '#4b5563' : '#d1d5db',
      },
      yAxis: {
        title: { text: 'Portfolio Value (₹)', style: { color: isDark ? '#fff' : '#374151' } },
        labels: {
          style: { color: isDark ? '#d1d5db' : '#6b7280' },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            return '₹' + Highcharts.numberFormat(this.value as number, 0);
          },
        },
        gridLineWidth: 1,
        gridLineColor: isDark ? '#374151' : '#e5e7eb',
      },
      tooltip: {
        shared: true,
        crosshairs: true,
        backgroundColor: isDark ? '#1f2937' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? '#4b5563' : '#d1d5db',
        borderRadius: 8,
        shadow: true,
        useHTML: true,
        style: { color: isDark ? '#fff' : '#374151' },
        formatter: function (this: unknown): string {
          // @ts-expect-error highcharts
          let tooltip: string = `<b style="color: ${isDark ? '#fff' : '#374151'}">${Highcharts.dateFormat('%e %b %Y', this.x as number)}</b><br/>`;
          // @ts-expect-error highcharts
          (this.points ?? []).forEach((point: any) => {
            tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>₹${Highcharts.numberFormat(point.y as number, 2)}</b><br/>`;
          });
          return tooltip;
        },
      },
      legend: { enabled: false },
      plotOptions: {
        line: {
          animation: { duration: 1000 },
          marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
          states: { hover: { lineWidth: 3 } },
        },
      },
      series: chartData,
      credits: { enabled: false },
    };
  }, [chartData, isDark]);

  const overallXirr = useMemo(() => {
    if (!stockTransactions.length || portfolioTotals.totalCurrentValue === 0) return null;
    const cashFlows: XirrCashFlow[] = [
      ...stockTransactions.map((tx) => ({
        amount: tx.type === 'credit' ? -tx.amount : tx.amount,
        when: new Date(tx.date),
      })),
      { amount: portfolioTotals.totalCurrentValue, when: new Date() },
    ];
    try {
      return xirr(cashFlows) * 100;
    } catch {
      return null;
    }
  }, [stockTransactions, portfolioTotals.totalCurrentValue]);

  // Per-stock unrealized STCG/LTCG split (what if sold today)
  const stockUnrealizedByName = useMemo(() => {
    const map: Record<string, { stcg: number; ltcg: number }> = {};
    const currentLots = cgData?.byAsset?.stocks?.currentLots ?? [];
    for (const lot of currentLots) {
      const name = lot.stockName ?? '';
      const row = processedPortfolioData.find((s) => s.stockName === name);
      if (!row?.isDataAvailable) continue;
      const gain = (row.currentPrice - lot.costPerUnit) * lot.units;
      if (!map[name]) map[name] = { stcg: 0, ltcg: 0 };
      if (lot.holdingDays > 365) map[name].ltcg += gain;
      else map[name].stcg += gain;
    }
    return map;
  }, [cgData, processedPortfolioData]);

  const stockUnrealized = useMemo(() => {
    const lots = cgData?.byAsset?.stocks?.currentLots ?? [];
    let stcg = 0,
      ltcg = 0;
    for (const lot of lots) {
      const row = processedPortfolioData.find((s) => s.stockName === lot.stockName);
      if (!row?.isDataAvailable) continue;
      const gain = (row.currentPrice - lot.costPerUnit) * lot.units;
      if (lot.holdingDays > 365) ltcg += gain;
      else stcg += gain;
    }
    return {
      stcg,
      ltcg,
      flat30: 0,
      stcgTax: Math.max(0, stcg) * 0.2,
      ltcgTax: Math.max(0, ltcg) * 0.125,
      flatTax: 0,
    };
  }, [cgData, processedPortfolioData]);

  const chartKey = useMemo(
    () => [timeframe, timeframeStart].join('|'),
    [timeframe, timeframeStart]
  );

  if (isLoading) {
    return (
      <div className="p-4 h-full">
        <h2 className="text-xl font-bold mb-4 text-center">Stocks Portfolio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="w-full h-[120px]" />
          ))}
        </div>
        <div className="max-w-7xl mx-auto border rounded-lg">
          <div className="bg-muted/50 p-4 border-b grid grid-cols-12 gap-4">
            {Array(12)
              .fill(null)
              .map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
          </div>
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="p-4 grid grid-cols-12 gap-4">
                {Array(12)
                  .fill(null)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
              </div>
            ))}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryStatCard
          label="Total Invested"
          value={formatCurrency(formatToTwoDecimals(portfolioTotals.totalInvested))}
          loading={isLoading}
        />
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
              <span>({formatToPercentage(portfolioTotals.totalProfitLossPercentage)}%)</span>
            </span>
          }
          valueClassName={getProfitLossColor(portfolioTotals.totalProfitLoss)}
          loading={isLoading}
        />
        <SummaryStatCard
          label="1 Day Change"
          value={
            <span className={getProfitLossColor(portfolioTotals.totalOneDayChange)}>
              {formatCurrency(formatToTwoDecimals(portfolioTotals.totalOneDayChange))} (
              {portfolioTotals.totalOneDayChangePercentage}%)
            </span>
          }
          valueClassName={getProfitLossColor(portfolioTotals.totalOneDayChange)}
          loading={isLoading}
        />
        <SummaryStatCard
          label="XIRR %"
          value={overallXirr !== null ? `${overallXirr.toFixed(2)}%` : 'N/A'}
          valueClassName={
            overallXirr !== null && overallXirr >= 0 ? 'text-green-600' : 'text-red-600'
          }
          loading={isLoading}
        />
      </div>

      {chartData && chartOptions && (
        <div className="relative mb-6" ref={chartRef}>
          <div className="absolute right-6 top-3 z-10 flex items-center gap-2">
            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList className="bg-transparent p-0 h-auto gap-1">
                {TIMEFRAMES.map((tf) => (
                  <TabsTrigger
                    key={tf.label}
                    value={tf.label}
                    className="border border-gray-400 text-gray-400 rounded-md px-2 py-0.5 text-xs font-normal min-w-[28px] h-7 transition-colors
                     duration-150 data-[state=active]:bg-gray-400 data-[state=active]:text-black data-[state=active]:border-gray-400 data-[state=active]:shadow-none
                     focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    {tf.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="bg-transparent rounded-lg border border-border p-4">
            <HighchartsReact highcharts={Highcharts} options={chartOptions} key={chartKey} />
          </div>
        </div>
      )}

      {processedPortfolioData.length > 0 && (
        <div className="w-full mx-auto rounded-lg border p-1">
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
                <TableHead>1 Day Change</TableHead>
                <TableHead>1 Day Change%</TableHead>
                <TableHead>P/L (₹)</TableHead>
                <TableHead>P/L %</TableHead>
                <TableHead>XIRR %</TableHead>
                <TableHead>STCG (Unrealized)</TableHead>
                <TableHead>LTCG (Unrealized)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedPortfolioData.map((row, idx) => {
                const stockTxs = stockTransactions.filter((tx) => tx.stockName === row.stockName);
                let stockXirr: number | null = null;
                if (stockTxs.length > 0 && row.currentValuation > 0) {
                  const cashFlows: XirrCashFlow[] = [
                    ...stockTxs.map((tx) => ({
                      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
                      when: new Date(tx.date),
                    })),
                    { amount: row.currentValuation, when: new Date() },
                  ];
                  try {
                    stockXirr = xirr(cashFlows) * 100;
                  } catch {
                    stockXirr = null;
                  }
                }
                return (
                  <TableRow key={row.stockName} className="hover:bg-muted transition">
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <Link
                        href={`/stocks/detail/${encodeURIComponent(row.stockName)}`}
                        className="underline hover:text-primary font-medium"
                      >
                        {row.stockName || '-'}
                      </Link>
                    </TableCell>
                    <TableCell>{row.numOfShares}</TableCell>
                    <TableCell>{row.avgPrice}</TableCell>
                    <TableCell>₹{row.investedAmount.toFixed(2)}</TableCell>
                    <TableCell>{row.isDataAvailable ? `₹${row.currentPrice}` : '-'}</TableCell>
                    <TableCell>
                      {row.isDataAvailable ? `₹${row.currentValuation.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {row.isDataAvailable ? (
                        <span className={getProfitLossColor(row.oneDayChange)}>
                          {formatCurrency(formatToTwoDecimals(row.oneDayChange))}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {row.isDataAvailable ? (
                        <span className={`text-sm ${getProfitLossColor(row.oneDayChange)}`}>
                          {row.oneDayChangePercentage}
                        </span>
                      ) : (
                        '-'
                      )}
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
                        {row.isDataAvailable ? formatToPercentage(row.profitLossPercentage) : '-'}
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
                    <TableCell>
                      {stockUnrealizedByName[row.stockName] ? (
                        <span
                          className={getProfitLossColor(stockUnrealizedByName[row.stockName].stcg)}
                        >
                          {formatCurrency(stockUnrealizedByName[row.stockName].stcg)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {stockUnrealizedByName[row.stockName] ? (
                        <span
                          className={getProfitLossColor(stockUnrealizedByName[row.stockName].ltcg)}
                        >
                          {formatCurrency(stockUnrealizedByName[row.stockName].ltcg)}
                        </span>
                      ) : (
                        '-'
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

      <div className="mt-6">
        <CapitalGainsSummary
          realizedByFY={cgData?.byAsset?.stocks?.realizedByFY ?? {}}
          unrealized={stockUnrealized}
          assetType="stocks"
          currentFY={cgData?.summary?.currentFY ?? ''}
          isLoading={cgLoading}
        />
      </div>
    </div>
  );
}
