'use client';

import { useStocksPortfolioQuery } from '@/api/query/stocks';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { StockTransaction } from '@/api/dataInterface';

export default function StocksPortfolioPage() {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const TIMEFRAMES = getTimeframes('1y');
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[4].label);
  const selectedTimeframe = TIMEFRAMES.find((tf) => tf.label === timeframe) || TIMEFRAMES[1];
  const timeframeStart = getPastDate(selectedTimeframe.days);

  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedStock, setSelectedStock] = useState('All');
  const [showTxPlotLines, setShowTxPlotLines] = useState(false);

  const { data: portfolioData, isLoading, error } = useStocksPortfolioQuery();

  // All data comes from the single portfolio query — no dependent waterfall
  const processedPortfolioData = portfolioData?.portfolio ?? [];
  const priceData = portfolioData?.priceData ?? {};
  const portfolioTotals = portfolioData?.summary ?? {
    totalInvested: 0,
    totalCurrentValue: 0,
    totalProfitLoss: 0,
    totalProfitLossPercentage: 0,
    totalOneDayChange: 0,
    totalOneDayChangePercentage: 0,
  };
  const stockTransactions: StockTransaction[] = portfolioData?.transactions ?? [];

  const txPlotLines = useMemo<Highcharts.XAxisPlotLinesOptions[]>(() => {
    if (!stockTransactions.length || selectedStock === 'All') return [];

    const inr = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });

    return stockTransactions
      .filter((tx) => tx.stockName === selectedStock)
      .map((tx) => {
        const tMs = Date.parse(tx.date);
        if (Number.isNaN(tMs) || tMs < timeframeStart) return null;

        const isCredit = tx.type === 'credit';
        const color = isCredit ? '#16a34a' : '#dc2626';
        const shares =
          typeof tx.numOfShares === 'number' ? ` • ${tx.numOfShares.toFixed(2)} sh` : '';

        return {
          value: tMs,
          color,
          width: 1,
          dashStyle: 'ShortDash',
          zIndex: 5,
          label: {
            text: `${isCredit ? '+' : '-'} ${inr.format(tx.amount)}${shares}`,
            align: 'left',
            verticalAlign: 'top',
            x: 2,
            y: 12,
            style: {
              color: isDark ? '#d1d5db' : '#374151',
              fontSize: '10px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            },
          },
        } as Highcharts.XAxisPlotLinesOptions;
      })
      .filter(Boolean) as Highcharts.XAxisPlotLinesOptions[];
  }, [stockTransactions, selectedStock, timeframeStart, isDark]);

  const chartData = useMemo(() => {
    if (!processedPortfolioData.length || !Object.keys(priceData).length) return null;

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
    ];

    const stockSeries: unknown[] = [];

    processedPortfolioData.forEach((stock, index) => {
      const stockPriceData = priceData[stock.stockName];
      if (!stockPriceData?.chart?.result?.[0]) return;

      const timestamps: number[] = stockPriceData.chart.result[0].timestamp || [];
      const closes = stockPriceData.chart.result[0].indicators?.quote?.[0]?.close || [];

      if (!timestamps.length || !closes.length) return;

      const seriesData = timestamps
        .map((timestamp, idx) => {
          const closePrice = closes[idx];
          const timeMs = timestamp * 1000;
          if (!closePrice || timeMs < timeframeStart) return null;
          return [timeMs, closePrice * stock.numOfShares];
        })
        .filter(Boolean);

      if (seriesData.length > 0) {
        stockSeries.push({
          name: stock.stockName,
          data: seriesData,
          color: colors[index % colors.length],
          lineWidth: 2,
          marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
        });
      }
    });

    return stockSeries;
  }, [processedPortfolioData, priceData, timeframeStart]);

  const chartOptions = useMemo(() => {
    if (!chartData) return null;

    const yAxisPlotLines: Highcharts.YAxisPlotLinesOptions[] = [];
    if (selectedStock !== 'All') {
      const stockRow = processedPortfolioData.find((s) => s.stockName === selectedStock);
      if (stockRow && stockRow.numOfShares > 0) {
        const avgPrice = stockRow.investedAmount / stockRow.numOfShares;
        yAxisPlotLines.push({
          value: avgPrice * stockRow.numOfShares,
          color: '#3B82F6',
          dashStyle: 'Dash',
          width: 2,
          zIndex: 5,
          label: {
            text: `Avg Price: ₹${avgPrice.toFixed(2)}`,
            align: 'right',
            x: -10,
            style: { color: '#3B82F6', fontWeight: 'bold' },
          },
        });
      }
    }

    return {
      chart: { type: 'line', height: 500, backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
      title: {
        text: 'Portfolio Performance Over Time',
        style: { fontSize: '18px', fontWeight: 'bold', color: isDark ? '#fff' : '#374151' },
      },
      subtitle: {
        text: 'Individual Stock Holdings Value',
        style: { color: isDark ? '#d1d5db' : '#6b7280' },
      },
      xAxis: {
        type: 'datetime',
        plotLines: showTxPlotLines && selectedStock !== 'All' ? txPlotLines : [],
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
        plotLines: yAxisPlotLines,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.points ?? []).forEach((point: any) => {
            tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>₹${Highcharts.numberFormat(point.y as number, 2)}</b><br/>`;
          });
          return tooltip;
        },
      },
      legend: {
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal',
        itemStyle: { fontSize: '12px', color: isDark ? '#d1d5db' : '#6b7280' },
        itemHoverStyle: { color: isDark ? '#fff' : '#374151' },
      },
      plotOptions: {
        line: {
          animation: { duration: 1000 },
          marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
          states: { hover: { lineWidth: 3 } },
        },
        series: { events: { legendItemClick: function () {} } },
      },
      series:
        selectedStock === 'All'
          ? chartData
          : chartData.filter(
              (s) =>
                typeof s === 'object' &&
                s !== null &&
                'name' in s &&
                (s as { name: string }).name === selectedStock
            ),
      credits: { enabled: false },
      responsive: {
        rules: [{ condition: { maxWidth: 500 }, chartOptions: { legend: { layout: 'horizontal', align: 'center', verticalAlign: 'bottom' } } }],
      },
    };
  }, [chartData, isDark, processedPortfolioData, selectedStock, showTxPlotLines, txPlotLines]);

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

  const chartKey = useMemo(
    () =>
      [selectedStock, timeframe, showTxPlotLines ? 'on' : 'off', txPlotLines.length, timeframeStart].join('|'),
    [selectedStock, timeframe, showTxPlotLines, txPlotLines.length, timeframeStart]
  );

  if (isLoading) {
    return (
      <div className="p-4 h-full">
        <h2 className="text-xl font-bold mb-4 text-center">Stocks Portfolio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="w-full h-[120px]" />)}
        </div>
        <div className="max-w-7xl mx-auto border rounded-lg">
          <div className="bg-muted/50 p-4 border-b grid grid-cols-12 gap-4">
            {Array(12).fill(null).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="p-4 grid grid-cols-12 gap-4">
                {Array(12).fill(null).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
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
          valueClassName={overallXirr !== null && overallXirr >= 0 ? 'text-green-600' : 'text-red-600'}
          loading={isLoading}
        />
      </div>

      {chartData && chartOptions && (
        <div className="relative mb-6" ref={chartRef}>
          <div className="absolute right-6 top-3 z-10 flex items-center gap-2">
            {selectedStock !== 'All' && (
              <Toggle
                pressed={showTxPlotLines}
                onPressedChange={setShowTxPlotLines}
                className="h-7 px-2 rounded-md border border-gray-400 text-gray-400
               data-[state=on]:bg-gray-400 data-[state=on]:text-black
               data-[state=on]:border-gray-400"
              >
                Transactions
              </Toggle>
            )}
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

          <div className="absolute left-6 top-3 z-10">
            <Select value={selectedStock} onValueChange={setSelectedStock}>
              <SelectTrigger className="w-[160px] border border-black text-black dark:border-white dark:text-white dark:bg-transparent">
                <SelectValue placeholder="Select stock" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 text-black dark:text-white border border-black dark:border-white">
                <SelectItem value="All">All</SelectItem>
                {processedPortfolioData.map((stock) => (
                  <SelectItem key={stock.stockName} value={stock.stockName}>
                    {stock.stockName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableRow
                    key={row.stockName}
                    className={`cursor-pointer hover:bg-muted transition ${
                      selectedStock === row.stockName ? 'bg-muted' : ''
                    }`}
                    onClick={() => {
                      setSelectedStock(row.stockName || 'All');
                      chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="underline">{row.stockName || '-'}</TableCell>
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
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {row.isDataAvailable ? (
                        <span className={`text-sm ${getProfitLossColor(row.oneDayChange)}`}>
                          {row.oneDayChangePercentage}
                        </span>
                      ) : '-'}
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
                      ) : 'N/A'}
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
