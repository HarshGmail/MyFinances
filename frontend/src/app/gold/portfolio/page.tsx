'use client';

import { useState, useMemo } from 'react';
import { useSafeGoldRatesQuery, useGoldTransactionsQuery } from '@/api/query';
import { useAppStore } from '@/store/useAppStore';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import { Skeleton } from '@/components/ui/skeleton';
import xirr, { XirrTransaction } from '@/utils/xirr';
import { getPastDate, getTimeframes } from '@/utils/chartHelpers';
import { formatCurrency } from '@/utils/numbers';

export default function GoldPortfolioPage() {
  type TooltipPoint = {
    y?: number;
    series: { name: string };
  };

  type TooltipContext = {
    x?: number;
    points?: TooltipPoint[];
  };

  const { theme } = useAppStore();
  const TIMEFRAMES = getTimeframes();
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1].label); // default '1m'
  const endDate = new Date().toISOString().slice(0, 10);
  const selectedTimeframe = TIMEFRAMES.find((tf) => tf.label === timeframe) || TIMEFRAMES[1];
  const startDate = getPastDate(selectedTimeframe.days, 'ymd');

  const { data, isLoading: ratesLoading, error } = useSafeGoldRatesQuery({ startDate, endDate });
  const { data: transactions, isLoading: transactionsLoading } = useGoldTransactionsQuery();

  const isLoading = ratesLoading || transactionsLoading;

  // Gold portfolio calculations
  const goldStats = useMemo(() => {
    if (!transactions || !data?.data || data.data.length === 0) return null;
    const totalGold = transactions.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.quantity : -tx.quantity),
      0
    );
    const totalInvested = transactions.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.amount : -tx.amount),
      0
    );
    // Last available gold rate (string to number)
    const lastRate = parseFloat(data.data[data.data.length - 1].rate);
    const sellRate = lastRate * 0.97; // 3% deduction
    const currentValue = totalGold * sellRate;
    const profitLoss = currentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
    // XIRR calculation
    const cashFlows: XirrTransaction[] = transactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
    // Add current value as final positive cash flow
    cashFlows.push({ amount: currentValue, when: new Date() });
    let xirrValue: number | null = null;
    try {
      xirrValue = xirr(cashFlows) * 100;
    } catch {
      xirrValue = null;
    }
    return {
      totalGold,
      totalInvested,
      currentValue,
      profitLoss,
      profitLossPercentage,
      xirrValue,
    };
  }, [transactions, data]);

  const chartOptions = useMemo(() => {
    if (!data?.data) return {};
    const prices = data.data.map((d) => parseFloat(d.rate));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const yMin = Math.floor(minPrice - (maxPrice - minPrice) * 0.05);
    const yMax = Math.ceil(maxPrice + (maxPrice - minPrice) * 0.05);
    return {
      chart: { type: 'area', backgroundColor: 'transparent', height: 320 },
      title: {
        text: 'Gold Price Trend',
        style: {
          fontWeight: 600,
          fontSize: '1.1rem',
          color: theme === 'dark' ? '#fff' : '#18181b',
        },
      },
      xAxis: {
        type: 'datetime',
        labels: {
          format: '{value:%d %b}',
          style: { color: theme === 'dark' ? '#FFF' : '#18181b' },
        },
        lineWidth: 1,
      },
      yAxis: {
        title: { text: 'Price (₹)', style: { color: theme === 'dark' ? '#FFF' : '#18181b' } },
        labels: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: function (this: any): string {
            return '₹' + this.value;
          },
          style: { color: theme === 'dark' ? '#FFF' : '#18181b' },
        },
        min: yMin,
        max: yMax,
        gridLineWidth: 0.5,
        gridLineColor: theme === 'dark' ? '#888' : '#cccccc',
      },
      tooltip: {
        xDateFormat: '%d %b %Y',
        pointFormat: '<b>₹{point.y:,.2f}</b>',
      },
      series: [
        {
          name: 'Gold Rate',
          data: data.data.map((d) => [Date.parse(d.date), parseFloat(d.rate)]),
          color: '#fbbf24',
          fillOpacity: 0.2,
        },
      ],
      credits: { enabled: false },
    };
  }, [data, theme]);

  const investmentChartOptions = useMemo(() => {
    if (!transactions || transactions.length === 0) return {};

    const currentGoldPrice =
      data?.data && data.data.length > 0 ? parseFloat(data.data[data.data.length - 1].rate) : null;

    const sortedTx = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const investmentEvents = sortedTx.filter((tx) => tx.type === 'credit');

    const eventData = investmentEvents.map((tx) => [Date.parse(tx.date), tx.amount]);
    const valuationData =
      currentGoldPrice !== null
        ? investmentEvents.map((tx) => [Date.parse(tx.date), tx.quantity * currentGoldPrice])
        : [];

    // Map date → invested amount for quick lookup in tooltip
    const investedMap = Object.fromEntries(
      investmentEvents.map((tx) => [Date.parse(tx.date), tx.amount])
    );

    return {
      chart: { type: 'column', backgroundColor: 'transparent', height: 420 },
      title: {
        text: 'Gold Invested vs Current Valuation',
        style: {
          fontWeight: 600,
          fontSize: '1.1rem',
          color: theme === 'dark' ? '#fff' : '#18181b',
        },
      },
      xAxis: {
        type: 'datetime',
        labels: {
          format: '{value:%b %Y}',
          style: { color: theme === 'dark' ? '#FFF' : '#18181b' },
        },
        title: { text: 'Month', style: { color: theme === 'dark' ? '#FFF' : '#18181b' } },
      },
      yAxis: [
        {
          title: {
            text: 'Amount (₹)',
            style: { color: theme === 'dark' ? '#FFF' : '#18181b' },
          },
          labels: {
            formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
              return '₹' + this.value;
            },
            style: { color: theme === 'dark' ? '#FFF' : '#18181b' },
          },
          min: 0,
          gridLineWidth: 0.5,
          gridLineColor: theme === 'dark' ? '#888' : '#cccccc',
        },
      ],
      tooltip: {
        shared: true,
        xDateFormat: '<b>%b %Y</b>',
        formatter: function (this: TooltipContext): string {
          const x = this.x ?? 0;
          let html = `<b>${Highcharts.dateFormat('%b %Y', x)}</b><br/>`;

          (this.points ?? []).forEach((point: TooltipPoint) => {
            const val = point.y ?? 0;
            html += `${point.series.name}: ₹${val.toLocaleString()}<br/>`;

            if (point.series.name === 'Current Valuation') {
              const invested = investedMap[x] || 0;
              const change = val - invested;
              html += `Change: ${change >= 0 ? '+' : ''}${change.toLocaleString()}<br/>`;
            }
          });

          return html;
        },
      },
      plotOptions: {
        column: {
          grouping: true,
          pointPadding: 0.1,
          groupPadding: 0.15,
          borderWidth: 0,
        },
      },
      series: [
        {
          type: 'column',
          name: 'Amount Invested',
          data: eventData,
          color: '#60a5fa',
          yAxis: 0,
        },
        ...(currentGoldPrice !== null
          ? [
              {
                type: 'column',
                name: 'Current Valuation',
                data: valuationData,
                color: '#22c55e',
                yAxis: 0,
              },
            ]
          : []),
      ],
      credits: { enabled: false },
      legend: { enabled: true },
    };
  }, [transactions, theme, data]);

  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card rounded-lg p-4 border border-border">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );

  // Skeleton for chart
  const ChartSkeleton = () => (
    <div className="bg-card rounded-lg p-4 relative">
      {/* Chart Title Skeleton */}
      <div className="text-center mb-4">
        <Skeleton className="h-6 w-48 mx-auto" />
      </div>

      {/* Tabs Skeleton */}
      <div className="absolute right-6 top-6 z-10">
        <div className="flex gap-1">
          {TIMEFRAMES.map((_, i) => (
            <Skeleton key={i} className="h-7 w-8 rounded-md" />
          ))}
        </div>
      </div>

      {/* Chart Area Skeleton */}
      <div className="h-[320px] flex flex-col space-y-4">
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
              <div className="flex-1 bg-gradient-to-b from-yellow-400/20 to-yellow-400/5 rounded animate-pulse"></div>

              {/* X-axis labels skeleton */}
              <div className="flex justify-between mt-2 px-4">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} className="h-4 w-12" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Investment Timeline Chart Skeleton
  const InvestmentChartSkeleton = () => (
    <div className="bg-card rounded-lg p-4 mt-6">
      {/* Chart Title Skeleton */}
      <div className="text-center mb-4">
        <Skeleton className="h-6 w-56 mx-auto" />
      </div>

      {/* Chart Area Skeleton */}
      <div className="h-[320px] flex flex-col space-y-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-full relative">
            {/* Y-axis labels skeleton */}
            <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between py-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-12" />
              ))}
            </div>

            {/* Main chart area skeleton with column chart pattern */}
            <div className="ml-16 mr-4 h-full flex flex-col">
              <div className="flex-1 flex items-end justify-around px-4 pb-4 space-x-2">
                {/* Simulated column bars */}
                {[40, 70, 30, 80, 50, 60].map((height, i) => (
                  <div
                    key={i}
                    className="bg-blue-400/30 animate-pulse rounded-t"
                    style={{ height: `${height}%`, width: '8%' }}
                  ></div>
                ))}
              </div>

              {/* X-axis labels skeleton */}
              <div className="flex justify-between mt-2 px-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-4 w-16" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="p-4 h-full">
        <div className="text-red-500 text-center">Failed to load gold rates</div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      <h2 className="text-2xl font-bold mb-6 text-center">Gold Portfolio</h2>

      {/* Portfolio Summary Cards */}
      {isLoading ? (
        <StatsSkeleton />
      ) : goldStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <SummaryStatCard label="Total Gold (gms)" value={goldStats.totalGold.toFixed(4)} />
          <SummaryStatCard label="Total Invested" value={formatCurrency(goldStats.totalInvested)} />
          <SummaryStatCard
            label={
              <>
                Current Valuation{' '}
                <span className={goldStats.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ({formatCurrency(goldStats.profitLoss)})
                </span>
              </>
            }
            value={
              <span className={goldStats.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(goldStats.currentValue)}{' '}
                <span>({goldStats.profitLossPercentage.toFixed(2)}%)</span>
              </span>
            }
            valueClassName={goldStats.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          <SummaryStatCard
            label="XIRR %"
            value={goldStats.xirrValue !== null ? goldStats.xirrValue.toFixed(2) + '%' : 'N/A'}
            valueClassName={
              goldStats.xirrValue !== null && goldStats.xirrValue >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }
          />
        </div>
      ) : null}

      {/* Gold Price Chart */}
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <div className="bg-card rounded-lg p-4 relative">
          {/* Tabs as overlay in top right of chart */}
          <div className="absolute right-6 top-6 z-10">
            <Tabs value={timeframe} onValueChange={setTimeframe} className="min-w-0">
              <TabsList className="bg-transparent p-0 h-auto gap-1">
                {TIMEFRAMES.map((tf) => (
                  <TabsTrigger
                    key={tf.label}
                    value={tf.label}
                    className="border border-yellow-400 text-yellow-400 rounded-md px-2 py-0.5 text-xs font-normal min-w-[28px] h-7 transition-colors duration-150 data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:border-yellow-400 data-[state=active]:shadow-none focus:outline-none focus:ring-2 focus:ring-yellow-400 border-[1px] font-normal"
                  >
                    {tf.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <HighchartsReact
            highcharts={Highcharts}
            options={chartOptions}
            containerProps={{ style: { height: '100%' } }}
          />
        </div>
      )}

      {/* Investment Timeline Chart */}
      {isLoading ? (
        <InvestmentChartSkeleton />
      ) : (
        <div className="bg-card rounded-lg p-4 mt-6">
          <HighchartsReact
            highcharts={Highcharts}
            options={investmentChartOptions}
            containerProps={{ style: { height: 420 } }}
          />
        </div>
      )}
    </div>
  );
}
