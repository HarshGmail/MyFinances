'use client';

import { useCryptoCoinPricesQuery, useCryptoTransactionsQuery } from '@/api/query';
import { useMultipleCoinCandlesQuery } from '@/api/query/crypto';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import groupBy from 'lodash/groupBy';
import xirr, { XirrTransaction as XirrCashFlow } from '@/utils/xirr';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import dynamic from 'next/dynamic';
import Highcharts from 'highcharts';
import { useAppStore } from '@/store/useAppStore';
import { CryptoTransaction } from '@/api/dataInterface';
import { formatCurrency, formatToPercentage } from '@/utils/numbers';
import { getProfitLossColor } from '@/utils/text';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

// Extended timeframes for crypto (can go back further than stocks)
const CRYPTO_TIMEFRAMES = [
  { label: '1D', days: 1 },
  { label: '3D', days: 3 },
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
  { label: '3Y', days: 1095 },
  { label: '5Y', days: 1825 },
];

// Define a consistent color palette for coins
const COIN_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Light Teal
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E9', // Light Blue
  '#F8C471', // Orange
  '#82E0AA', // Light Green
  '#F1948A', // Light Red
  '#76D7C4', // Aqua
  '#AED6F1', // Sky Blue
  '#D7BDE2', // Lavender
  '#F9E79F', // Light Yellow
];

function getPastDate(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

const HighchartsReact = dynamic(() => import('highcharts-react-official'), { ssr: false });

export default function CryptoPortfolioPage() {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const chartRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState(CRYPTO_TIMEFRAMES[6].label); // Default to 1Y
  const [selectedCoin, setSelectedCoin] = useState('All');

  // Track the maximum timeframe we've fetched data for
  const [maxFetchedDays, setMaxFetchedDays] = useState(0);

  const selectedTimeframe =
    CRYPTO_TIMEFRAMES.find((tf) => tf.label === timeframe) || CRYPTO_TIMEFRAMES[6];
  const timeframeStart = getPastDate(selectedTimeframe.days);

  // Determine if we need to fetch new data
  const needsNewData = selectedTimeframe.days > maxFetchedDays;
  const fetchDays = needsNewData ? selectedTimeframe.days : maxFetchedDays;

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

  // Create a color mapping for coins based on their order in portfolioData
  const coinColorMap = useMemo(() => {
    const colorMap: Record<string, string> = {};
    portfolioData.forEach((coin, index) => {
      colorMap[coin.currency] = COIN_COLORS[index % COIN_COLORS.length];
    });
    return colorMap;
  }, [portfolioData]);

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

  // Create a stable list of coin symbols to fetch data for
  const coinSymbols = useMemo(() => {
    return portfolioData.map((coin) => coin.currency).filter(Boolean);
  }, [portfolioData]);

  // Fetch historical data for all coins using the new multiple coins query
  // Only fetch more data if we need a longer timeframe than what we already have
  const { data: multipleCoinCandles, isLoading: candlesLoading } = useMultipleCoinCandlesQuery(
    coinSymbols,
    '1d',
    fetchDays
  );

  // Update maxFetchedDays when we successfully get new data
  useEffect(() => {
    if (multipleCoinCandles && needsNewData) {
      setMaxFetchedDays(fetchDays);
    }
  }, [multipleCoinCandles, needsNewData, fetchDays]);

  // Process historical data for charts
  const chartData = useMemo(() => {
    if (!portfolioData.length || !multipleCoinCandles) return null;

    const coinSeries: unknown[] = [];

    portfolioData.forEach((coin) => {
      const candles = multipleCoinCandles[coin.currency];

      if (!candles || !candles.length) return;

      // Create series data for this coin
      const seriesData = candles
        .map((candle) => {
          // Convert timestamp to milliseconds (candle.time might be in seconds)
          const timeMs = candle.time > 1000000000000 ? candle.time : candle.time * 1000;
          if (timeMs < timeframeStart) return null;
          const portfolioValue = candle.close * coin.balance;
          return [timeMs, portfolioValue];
        })
        .filter(Boolean);

      if (seriesData.length > 0) {
        coinSeries.push({
          name: coin.currency,
          data: seriesData,
          color: coinColorMap[coin.currency], // Use synchronized color
          lineWidth: 2,
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true,
                radius: 4,
              },
            },
          },
        });
      }
    });

    return coinSeries;
  }, [portfolioData, multipleCoinCandles, timeframeStart, coinColorMap]);

  // Find all transactions for a given coin
  const getCoinTransactions = useCallback(
    (coin: string) => {
      if (!transactions) return [];
      return transactions.filter(
        (tx: CryptoTransaction) =>
          (tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase()) === coin
      );
    },
    [transactions] // only re-create when `transactions` changes
  );

  // Vertical lines for this coin's transactions (within current timeframe)
  const transactionPlotLines = useMemo(() => {
    if (selectedCoin === 'All' || !transactions) return [];

    const txs = getCoinTransactions(selectedCoin); // you already have this helper
    const inr = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });

    // Limit to current timeframe & cap to last 20 to avoid clutter
    return txs
      .map((tx) => {
        const t = new Date(tx.date).getTime();
        if (t < timeframeStart) return null;

        const isCredit = tx.type === 'credit';
        const color = isCredit ? '#16a34a' /* green-600 */ : '#dc2626'; /* red-600 */
        const labelText = `${isCredit ? 'Buy' : 'Sell'} ${inr.format(tx.amount)}`;

        const opt: Highcharts.XAxisPlotLinesOptions = {
          value: t, // timestamp in ms
          color,
          width: 1,
          dashStyle: 'ShortDash',
          zIndex: 5,
          label: {
            text: labelText,
            align: 'left',
            verticalAlign: 'top',
            x: 2,
            y: 14,
            style: {
              color: isDark ? '#d1d5db' : '#374151',
              fontSize: '10px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            },
          },
        };
        return opt;
      })
      .filter(Boolean)
      .slice(-20);
  }, [selectedCoin, transactions, getCoinTransactions, timeframeStart, isDark]);

  // Chart configuration
  const chartOptions = useMemo(() => {
    if (!chartData) return null;

    return {
      chart: {
        type: 'line',
        height: 500,
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'inherit',
        },
      },
      title: {
        text: 'Crypto Portfolio Performance Over Time',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: isDark ? '#fff' : '#374151',
        },
      },
      subtitle: {
        text: 'Individual Coin Holdings Value',
        style: {
          color: isDark ? '#d1d5db' : '#6b7280',
        },
      },
      xAxis: {
        type: 'datetime',
        plotLines: selectedCoin === 'All' ? [] : transactionPlotLines,
        title: {
          text: 'Date',
          style: {
            color: isDark ? '#fff' : '#374151',
          },
        },
        labels: {
          style: {
            color: isDark ? '#d1d5db' : '#6b7280',
          },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            // Format based on timeframe for better readability
            if (selectedTimeframe.days <= 7) {
              // For 7 days or less, show day and month
              return Highcharts.dateFormat('%e %b', this.value as number);
            } else if (selectedTimeframe.days <= 90) {
              // For up to 3 months, show day and month
              return Highcharts.dateFormat('%e %b', this.value as number);
            } else if (selectedTimeframe.days <= 365) {
              // For up to 1 year, show month and year
              return Highcharts.dateFormat('%b %Y', this.value as number);
            } else {
              // For longer periods, show month and year
              return Highcharts.dateFormat('%b %Y', this.value as number);
            }
          },
        },
        gridLineWidth: 1,
        gridLineColor: isDark ? '#374151' : '#e5e7eb',
        lineColor: isDark ? '#4b5563' : '#d1d5db',
        tickInterval:
          selectedTimeframe.days <= 7
            ? 24 * 3600 * 1000 // Daily for 7D
            : selectedTimeframe.days <= 30
              ? 7 * 24 * 3600 * 1000 // Weekly for 1M
              : selectedTimeframe.days <= 90
                ? 15 * 24 * 3600 * 1000 // Bi-weekly for 3M
                : selectedTimeframe.days <= 365
                  ? 30 * 24 * 3600 * 1000 // Monthly for 1Y
                  : 90 * 24 * 3600 * 1000, // Quarterly for longer periods
      },
      yAxis: {
        title: {
          text: 'Portfolio Value (₹)',
          style: {
            color: isDark ? '#fff' : '#374151',
          },
        },
        labels: {
          style: {
            color: isDark ? '#d1d5db' : '#6b7280',
          },
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
        style: {
          color: isDark ? '#fff' : '#374151',
        },
        formatter: function (this: unknown): string {
          // @ts-expect-error highcharts
          let tooltip: string = `<b style="color: ${isDark ? '#fff' : '#374151'}">${Highcharts.dateFormat('%e %b %Y', this.x as number)}</b><br/>`;

          // @ts-expect-error highcharts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.points ?? []).forEach((point: any) => {
            if (selectedCoin === 'All') {
              // Show portfolio valuation when viewing all coins
              tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>₹${Highcharts.numberFormat(point.y as number, 2)}</b><br/>`;
            } else {
              // Show coin price when viewing a single coin
              const coin = portfolioData.find((c) => c.currency === point.series.name);
              if (coin && multipleCoinCandles && multipleCoinCandles[coin.currency]) {
                // Find the candle data for this specific timestamp
                const candles = multipleCoinCandles[coin.currency];
                const targetTime = (point.x as number) / 1000; // Convert back to seconds
                const candle = candles.find((c) => {
                  const candleTime = c.time > 1000000000000 ? c.time / 1000 : c.time;
                  return Math.abs(candleTime - targetTime) < 43200; // Within 12 hours
                });

                if (candle) {
                  tooltip += `<span style="color:${point.color}">●</span> ${point.series.name} Price: <b>₹${Highcharts.numberFormat(candle.close, 2)}</b><br/>`;
                  tooltip += `<span style="color:${point.color}">●</span> Holdings Value: <b>₹${Highcharts.numberFormat(point.y as number, 2)}</b><br/>`;
                } else {
                  // Fallback to portfolio value if we can't find the candle
                  tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>₹${Highcharts.numberFormat(point.y as number, 2)}</b><br/>`;
                }
              } else {
                // Fallback to portfolio value
                tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>₹${Highcharts.numberFormat(point.y as number, 2)}</b><br/>`;
              }
            }
          });

          return tooltip;
        },
      },
      legend: {
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal',
        itemStyle: {
          fontSize: '12px',
          color: isDark ? '#d1d5db' : '#6b7280',
        },
        itemHoverStyle: {
          color: isDark ? '#fff' : '#374151',
        },
      },
      plotOptions: {
        line: {
          animation: {
            duration: 1000,
          },
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true,
                radius: 4,
              },
            },
          },
          states: {
            hover: {
              lineWidth: 3,
            },
          },
        },
        series: {
          events: {
            legendItemClick: function () {},
          },
        },
      },
      series:
        selectedCoin === 'All'
          ? chartData
          : chartData.filter(
              (s) =>
                typeof s === 'object' &&
                s !== null &&
                'name' in s &&
                (s as { name: string }).name === selectedCoin
            ),
      credits: {
        enabled: false,
      },
      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 500,
            },
            chartOptions: {
              legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
              },
            },
          },
        ],
      },
    };
  }, [
    chartData,
    isDark,
    selectedCoin,
    transactionPlotLines,
    selectedTimeframe.days,
    portfolioData,
    multipleCoinCandles,
  ]);

  // Pie chart data for invested amount per coin with synchronized colors
  const pieData = useMemo(
    () =>
      portfolioData.map((item) => ({
        name: item.currency,
        y: item.investedAmount,
        coinName: item.coinName,
        color: coinColorMap[item.currency], // Use synchronized color
      })),
    [portfolioData, coinColorMap]
  );

  // Update your pieOptions useMemo to include the click handler:
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
          point: {
            events: {
              click: function (this: Highcharts.Point) {
                if (this.name === selectedCoin) setSelectedCoin('All');
                else {
                  setSelectedCoin(this.name);
                  chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              },
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
    [theme, pieData, selectedCoin] // Add dependencies
  );

  const isLoading = transactionsLoading || pricesLoading;
  const error = transactionsError || pricesError;
  // Only show chart loading when we're actually fetching new data
  const isChartLoading = candlesLoading && needsNewData;

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

  return (
    <div className="p-4 h-full">
      <h2 className="text-xl font-bold mb-6 text-center">Crypto Portfolio</h2>

      {/* Portfolio Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
                <span>({formatToPercentage(summary.totalProfitLossPercentage)}%)</span>
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
        </div>
      )}

      {/* Portfolio Performance Chart */}
      {portfolioData.length > 0 && (
        <div className="relative mb-6" ref={chartRef}>
          {/* Timeframe Tabs in top-right */}
          <div className="absolute right-6 top-3 z-10">
            <Tabs value={timeframe} onValueChange={setTimeframe}>
              <TabsList className="bg-transparent p-0 h-auto gap-1">
                {CRYPTO_TIMEFRAMES.map((tf) => (
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

          {/* Coin Filter in top-left */}
          <div className="absolute left-6 top-3 z-10">
            <Select value={selectedCoin} onValueChange={setSelectedCoin}>
              <SelectTrigger className="w-[160px] border border-black text-black dark:border-white dark:text-white dark:bg-transparent">
                <SelectValue placeholder="Select coin" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 text-black dark:text-white border border-black dark:border-white">
                <SelectItem value="All">All</SelectItem>
                {portfolioData.map((coin) => (
                  <SelectItem key={coin.currency} value={coin.currency}>
                    {coin.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-transparent rounded-lg border border-border p-4">
            {isChartLoading ? (
              <div className="h-[500px] flex flex-col space-y-4">
                {/* Chart Title Skeleton */}
                <div className="text-center">
                  <Skeleton className="h-6 w-80 mx-auto mb-2" />
                  <Skeleton className="h-4 w-60 mx-auto" />
                </div>

                {/* Chart Area Skeleton */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full h-full relative">
                    {/* Y-axis labels skeleton */}
                    <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between py-8">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-4 w-12" />
                      ))}
                    </div>

                    {/* Main chart area skeleton */}
                    <div className="ml-16 mr-4 h-full flex flex-col">
                      <div className="flex-1 bg-gradient-to-b from-muted/20 to-muted/5 rounded animate-pulse"></div>

                      {/* X-axis labels skeleton */}
                      <div className="flex justify-between mt-2 px-4">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                          <Skeleton key={i} className="h-4 w-12" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend Skeleton */}
                <div className="flex justify-center space-x-6 pt-4">
                  {portfolioData.slice(0, 4).map((_, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            ) : chartData && chartOptions ? (
              <HighchartsReact
                highcharts={Highcharts}
                options={chartOptions}
                key={`${selectedCoin}-${selectedTimeframe.label}-${fetchDays}`}
              />
            ) : (
              <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                <Skeleton className="h-3 w-16 rounded-full" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Portfolio Table */}
      {portfolioData.length > 0 && (
        <div className="max-w-full mx-auto flex flex-row gap-4">
          <div className="w-3/4 overflow-x-auto">
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
                    <TableRow
                      key={item.currency || idx}
                      className={`cursor-pointer hover:bg-muted transition ${
                        selectedCoin === item.currency ? 'bg-muted' : ''
                      }`}
                      onClick={() => {
                        setSelectedCoin(item.currency || 'All');
                        chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium underline">{item.coinName}</TableCell>
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
          {/* Pie Chart Card */}
          <div className="w-1/4">
            <div className="w-full min-w-[180px] flex flex-col items-center justify-center min-h-[180px]">
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
            </div>
          </div>
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
