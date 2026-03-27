import { useMemo, useCallback, RefObject } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/useAppStore';
import { CryptoTransaction } from '@/api/dataInterface';
import { PortfolioItem, CRYPTO_TIMEFRAMES } from './useCryptoPortfolioData';

type MultipleCoinCandles = Record<string, { time: number; close: number }[]>;

export default function CryptoPerformanceChart({
  portfolioData,
  transactions,
  multipleCoinCandles,
  chartData,
  selectedCoin,
  setSelectedCoin,
  timeframe,
  setTimeframe,
  selectedTimeframeDays,
  timeframeStart,
  isChartLoading,
  chartRef,
}: {
  portfolioData: PortfolioItem[];
  transactions: CryptoTransaction[] | undefined;
  multipleCoinCandles: MultipleCoinCandles | undefined;
  chartData: unknown[] | null;
  selectedCoin: string;
  setSelectedCoin: (c: string) => void;
  timeframe: string;
  setTimeframe: (t: string) => void;
  selectedTimeframeDays: number;
  timeframeStart: number;
  isChartLoading: boolean;
  chartRef: RefObject<HTMLDivElement | null>;
}) {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  const getCoinTransactions = useCallback(
    (coin: string) => {
      if (!transactions) return [];
      return transactions.filter(
        (tx) => (tx.coinSymbol?.toUpperCase() || tx.coinName?.toUpperCase()) === coin
      );
    },
    [transactions]
  );

  const transactionPlotLines = useMemo(() => {
    if (selectedCoin === 'All' || !transactions) return [];
    const inr = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
    return getCoinTransactions(selectedCoin)
      .map((tx) => {
        const t = new Date(tx.date).getTime();
        if (t < timeframeStart) return null;
        const isCredit = tx.type === 'credit';
        const opt: Highcharts.XAxisPlotLinesOptions = {
          value: t,
          color: isCredit ? '#16a34a' : '#dc2626',
          width: 1,
          dashStyle: 'ShortDash',
          zIndex: 5,
          label: {
            text: `${isCredit ? 'Buy' : 'Sell'} ${inr.format(tx.amount)}`,
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
      .filter((o): o is Highcharts.XAxisPlotLinesOptions => Boolean(o))
      .slice(-20);
  }, [selectedCoin, transactions, getCoinTransactions, timeframeStart, isDark]);

  const avgPriceLine = useMemo(() => {
    if (selectedCoin === 'All') return null;
    const coin = portfolioData.find((c) => c.currency === selectedCoin);
    if (!coin || coin.balance <= 0) return null;
    const avgPrice = coin.investedAmount / coin.balance;
    return {
      name: `${selectedCoin} Avg Price`,
      type: 'line' as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:
        chartData
          ?.find((s: any) => s.name === selectedCoin)
          // @ts-expect-error highcharts type
          ?.data.map(([time]: [number]) => [time, avgPrice * coin.balance]) || [],
      color: isDark ? '#93c5fd' : '#1e3a8a',
      dashStyle: 'Dash',
      lineWidth: 2,
      marker: { enabled: false },
      enableMouseTracking: false,
      showInLegend: true,
    };
  }, [selectedCoin, portfolioData, chartData, isDark]);

  const chartOptions = useMemo(() => {
    if (!chartData) return null;
    const selectedCoinData = portfolioData.find((c) => c.currency === selectedCoin);
    const avgPrice =
      selectedCoinData && selectedCoinData.balance > 0
        ? selectedCoinData.investedAmount / selectedCoinData.balance
        : null;

    return {
      chart: {
        type: 'line',
        height: 500,
        backgroundColor: 'transparent',
        style: { fontFamily: 'inherit' },
      },
      title: {
        text: 'Crypto Portfolio Performance Over Time',
        style: { fontSize: '18px', fontWeight: 'bold', color: isDark ? '#fff' : '#374151' },
      },
      subtitle: {
        text: 'Individual Coin Holdings Value',
        style: { color: isDark ? '#d1d5db' : '#6b7280' },
      },
      xAxis: {
        type: 'datetime',
        plotLines: selectedCoin === 'All' ? [] : transactionPlotLines,
        labels: {
          style: { color: isDark ? '#d1d5db' : '#6b7280' },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            return selectedTimeframeDays <= 90
              ? Highcharts.dateFormat('%e %b', this.value as number)
              : Highcharts.dateFormat('%b %Y', this.value as number);
          },
        },
        gridLineWidth: 1,
        gridLineColor: isDark ? '#374151' : '#e5e7eb',
        lineColor: isDark ? '#4b5563' : '#d1d5db',
        tickInterval:
          selectedTimeframeDays <= 7
            ? 86400000
            : selectedTimeframeDays <= 30
              ? 604800000
              : selectedTimeframeDays <= 90
                ? 1296000000
                : selectedTimeframeDays <= 365
                  ? 2592000000
                  : 7776000000,
      },
      yAxis: {
        title: { text: 'Portfolio Value (₹)', style: { color: isDark ? '#fff' : '#374151' } },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            return '₹' + Highcharts.numberFormat(this.value as number, 0);
          },
          style: { color: isDark ? '#d1d5db' : '#6b7280' },
        },
        gridLineWidth: 1,
        gridLineColor: isDark ? '#374151' : '#e5e7eb',
        plotLines:
          selectedCoin === 'All' || !avgPriceLine || avgPrice === null
            ? []
            : [
                {
                  value: avgPrice * (selectedCoinData?.balance ?? 1),
                  color: isDark ? '#93c5fd' : '#1e3a8a',
                  width: 1.5,
                  dashStyle: 'Dash',
                  zIndex: 5,
                  label: {
                    text: `Avg Price ₹${avgPrice.toFixed(2)}`,
                    align: 'right',
                    x: -5,
                    style: {
                      color: isDark ? '#93c5fd' : '#1e3a8a',
                      fontSize: '11px',
                      fontWeight: '500',
                    },
                  },
                },
              ],
      },
      tooltip: {
        shared: true,
        crosshairs: true,
        backgroundColor: isDark ? '#1f2937' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? '#4b5563' : '#d1d5db',
        borderRadius: 8,
        shadow: true,
        useHTML: true,
        style: { color: isDark ? '#fff' : '#374151' },
        formatter: function (this: unknown): string {
          // @ts-expect-error highcharts
          let tooltip = `<b style="color:${isDark ? '#fff' : '#374151'}">${Highcharts.dateFormat('%e %b %Y', this.x as number)}</b><br/>`;
          // @ts-expect-error highcharts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.points ?? []).forEach((point: any) => {
            if (selectedCoin === 'All') {
              tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>₹${Highcharts.numberFormat(point.y, 2)}</b><br/>`;
            } else {
              const coin = portfolioData.find((c) => c.currency === point.series.name);
              if (coin && multipleCoinCandles?.[coin.currency]) {
                const candle = multipleCoinCandles[coin.currency].find(
                  (c) =>
                    Math.abs((c.time > 1000000000000 ? c.time / 1000 : c.time) - point.x / 1000) <
                    43200
                );
                if (candle) {
                  tooltip += `<span style="color:${point.color}">●</span> ${point.series.name} Price: <b>₹${Highcharts.numberFormat(candle.close, 2)}</b><br/>`;
                  tooltip += `<span style="color:${point.color}">●</span> Holdings Value: <b>₹${Highcharts.numberFormat(point.y, 2)}</b><br/>`;
                } else
                  tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>₹${Highcharts.numberFormat(point.y, 2)}</b><br/>`;
              } else
                tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>₹${Highcharts.numberFormat(point.y, 2)}</b><br/>`;
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
        selectedCoin === 'All'
          ? chartData
          : [
              ...chartData.filter(
                (s) =>
                  typeof s === 'object' &&
                  s !== null &&
                  'name' in s &&
                  (s as { name: string }).name === selectedCoin
              ),
              ...(avgPriceLine ? [avgPriceLine] : []),
            ],
      credits: { enabled: false },
      responsive: {
        rules: [
          {
            condition: { maxWidth: 500 },
            chartOptions: {
              legend: { layout: 'horizontal', align: 'center', verticalAlign: 'bottom' },
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
    selectedTimeframeDays,
    avgPriceLine,
    portfolioData,
    multipleCoinCandles,
  ]);

  return (
    <div className="relative mb-6" ref={chartRef}>
      <div className="absolute right-6 top-3 z-10">
        <Tabs value={timeframe} onValueChange={setTimeframe}>
          <TabsList className="bg-transparent p-0 h-auto gap-1">
            {CRYPTO_TIMEFRAMES.map((tf) => (
              <TabsTrigger
                key={tf.label}
                value={tf.label}
                className="border border-gray-400 text-gray-400 rounded-md px-2 py-0.5 text-xs font-normal min-w-[28px] h-7 transition-colors duration-150
                  data-[state=active]:bg-gray-400 data-[state=active]:text-black data-[state=active]:border-gray-400 data-[state=active]:shadow-none
                  focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {tf.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

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
            <div className="text-center">
              <Skeleton className="h-6 w-80 mx-auto mb-2" />
              <Skeleton className="h-4 w-60 mx-auto" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full h-full relative">
                <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between py-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-4 w-12" />
                  ))}
                </div>
                <div className="ml-16 mr-4 h-full flex flex-col">
                  <div className="flex-1 bg-gradient-to-b from-muted/20 to-muted/5 rounded animate-pulse" />
                  <div className="flex justify-between mt-2 px-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <Skeleton key={i} className="h-4 w-12" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
            key={`${selectedCoin}-${timeframe}`}
          />
        ) : (
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            <Skeleton className="h-3 w-16 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
