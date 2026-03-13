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
import { Toggle } from '@/components/ui/toggle';

export default function GoldPortfolioPage() {
  const { theme } = useAppStore();
  const TIMEFRAMES = getTimeframes();
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1].label); // default '1m'

  const endDate = new Date().toISOString().slice(0, 10);
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const startDate = fiveYearsAgo.toISOString().slice(0, 10);

  const selectedTimeframe = TIMEFRAMES.find((tf) => tf.label === timeframe) || TIMEFRAMES[1];
  const timeframeStartDate = getPastDate(selectedTimeframe.days, 'ymd');

  const { data, isLoading: ratesLoading, error } = useSafeGoldRatesQuery({ startDate, endDate });
  const { data: transactions, isLoading: transactionsLoading } = useGoldTransactionsQuery();

  const isLoading = ratesLoading || transactionsLoading;

  const [showInvestmentPlotLines, setShowInvestmentPlotLines] = useState(false);

  const filteredRates = useMemo(() => {
    if (!data?.data) return [];
    const cutoff = Date.parse(timeframeStartDate);
    return data.data.filter((d) => Date.parse(d.date) >= cutoff);
  }, [data, timeframeStartDate]);

  // Gold portfolio calculations
  const goldStats = useMemo(() => {
    if (!transactions || !filteredRates || filteredRates.length === 0) return null;

    const totalGold = transactions.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.quantity : -tx.quantity),
      0
    );
    const totalInvested = transactions.reduce(
      (sum, tx) => sum + (tx.type === 'credit' ? tx.amount : -tx.amount),
      0
    );

    const lastRate = parseFloat(filteredRates[filteredRates.length - 1].rate);
    const avgPrice = totalGold > 0 ? totalInvested / totalGold : 0;

    const sellRate = lastRate * 0.97; // 3% deduction
    const currentValue = totalGold * sellRate;
    const profitLoss = currentValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    // XIRR calc
    const cashFlows: XirrTransaction[] = transactions.map((tx) => ({
      amount: tx.type === 'credit' ? -tx.amount : tx.amount,
      when: new Date(tx.date),
    }));
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
      avgPrice,
      currentPrice: lastRate,
    };
  }, [transactions, filteredRates]);

  const transactionPlotLines = useMemo(() => {
    if (!transactions?.length) return [];
    const cutoff = Date.parse(timeframeStartDate);

    const inr = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });

    return transactions
      .map((tx) => {
        const tMs = Date.parse(tx.date);
        if (Number.isNaN(tMs) || tMs < cutoff) return null;

        const isCredit = tx.type === 'credit';
        const color = isCredit ? '#16a34a' : '#dc2626';
        const qty = typeof tx.quantity === 'number' ? ` • ${Number(tx.quantity).toFixed(2)}g` : '';
        const labelText = `${isCredit ? '+' : '-'} ${inr.format(tx.amount)}${qty}`;

        const opt: Highcharts.XAxisPlotLinesOptions = {
          value: tMs,
          color,
          width: 1,
          dashStyle: 'ShortDash',
          zIndex: 5,
          label: {
            text: labelText,
            align: 'left',
            verticalAlign: 'top',
            x: 2,
            y: 12,
            style: {
              color: theme === 'dark' ? '#d1d5db' : '#374151',
              fontSize: '10px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            },
          },
        };
        return opt;
      })
      .filter((opt): opt is Highcharts.XAxisPlotLinesOptions => Boolean(opt))
      .slice(-30);
  }, [transactions, timeframeStartDate, theme]);

  const chartOptions = useMemo(() => {
    if (!filteredRates.length) return {};
    const prices = filteredRates.map((d) => parseFloat(d.rate));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const yMin = Math.floor(minPrice - (maxPrice - minPrice) * 0.05);
    const yMax = Math.ceil(maxPrice + (maxPrice - minPrice) * 0.05);
    return {
      chart: { type: 'area', backgroundColor: 'transparent', height: 500 },
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
        plotLines: showInvestmentPlotLines && transactionPlotLines,
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
        plotLines: goldStats
          ? [
              {
                value: goldStats.avgPrice,
                color: '#3b82f6', // blue line
                width: 1.5,
                dashStyle: 'Dash',
                label: {
                  text: `Avg Price ₹${goldStats.avgPrice.toFixed(2)}`,
                  align: 'right',
                  x: -5,
                  style: {
                    color: theme === 'dark' ? '#93c5fd' : '#1e3a8a',
                    fontSize: '11px',
                    fontWeight: '500',
                  },
                },
                zIndex: 5,
              },
            ]
          : [],
      },
      tooltip: {
        xDateFormat: '%d %b %Y',
        pointFormat: '<b>₹{point.y:,.2f}</b>',
      },
      series: [
        {
          name: 'Gold Rate',
          data: filteredRates.map((d) => [Date.parse(d.date), parseFloat(d.rate)]),
          color: '#fbbf24',
          fillOpacity: 0.2,
        },
      ],
      credits: { enabled: false },
    };
  }, [filteredRates, theme, showInvestmentPlotLines, transactionPlotLines, goldStats]);

  const investmentChartOptions = useMemo(() => {
    if (!transactions?.length) return {};

    const currentGoldPrice =
      data?.data && data.data.length > 0 ? parseFloat(data.data[data.data.length - 1].rate) : null;

    const MONTH_NAMES = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    type MonthGroup = {
      label: string;
      totalInvested: number;
      totalValuation: number;
      transactions: typeof transactions;
    };

    // Group credit transactions by month
    const monthMap = new Map<string, MonthGroup>();
    [...transactions]
      .filter((tx) => tx.type === 'credit')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((tx) => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, { label, totalInvested: 0, totalValuation: 0, transactions: [] });
        }
        const g = monthMap.get(key)!;
        g.totalInvested += tx.amount;
        if (currentGoldPrice !== null) g.totalValuation += tx.quantity * currentGoldPrice;
        g.transactions.push(tx);
      });

    const months = Array.from(monthMap.values());
    if (!months.length) return {};

    const categories = months.map((m) => m.label);
    const textColor = theme === 'dark' ? '#e5e7eb' : '#18181b';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';

    return {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        height: 440,
        style: { fontFamily: 'inherit' },
      },
      title: {
        text: 'Monthly Gold Investment',
        style: {
          fontWeight: 600,
          fontSize: '1.1rem',
          color: theme === 'dark' ? '#fff' : '#18181b',
        },
      },
      xAxis: {
        categories,
        labels: {
          style: { color: textColor, fontSize: '11px' },
          rotation: 0,
          align: 'right',
        },
        lineColor: gridColor,
        tickColor: gridColor,
      },
      yAxis: {
        title: { text: 'Amount (₹)', style: { color: textColor } },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
            const v = this.value as number;
            return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v.toLocaleString('en-IN')}`;
          },
          style: { color: textColor },
        },
        min: 0,
        gridLineWidth: 0.5,
        gridLineColor: gridColor,
      },
      tooltip: {
        useHTML: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (this: any): string {
          const month: MonthGroup = months[this.point.index];
          const gain =
            currentGoldPrice !== null ? month.totalValuation - month.totalInvested : null;
          const gainPct =
            gain !== null && month.totalInvested > 0 ? (gain / month.totalInvested) * 100 : null;
          const gainColor = gain !== null && gain >= 0 ? '#4ade80' : '#f87171';

          let html = `<div style="padding:8px;min-width:210px;font-size:12px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(128,128,128,0.3);">${month.label}</div>`;

          month.transactions.forEach((tx) => {
            const txVal = currentGoldPrice !== null ? tx.quantity * currentGoldPrice : null;
            const txGain = txVal !== null ? txVal - tx.amount : null;
            const txGainColor = txGain !== null && txGain >= 0 ? '#4ade80' : '#f87171';
            const d = new Date(tx.date);
            html += `<div style="margin-bottom:8px;padding:6px;background:rgba(128,128,128,0.1);border-radius:6px;">
              <div style="color:#94a3b8;font-size:11px;margin-bottom:3px;">${d.getDate()} ${MONTH_NAMES[d.getMonth()]} · ${tx.quantity.toFixed(4)}g</div>
              <div style="color:#93c5fd;">Invested: <b>₹${tx.amount.toLocaleString('en-IN')}</b></div>`;
            if (txVal !== null && txGain !== null) {
              html += `<div style="color:${txGainColor};">Now: <b>₹${Math.round(txVal).toLocaleString('en-IN')}</b> <span style="font-size:11px;">(${txGain >= 0 ? '+' : ''}${((txGain / tx.amount) * 100).toFixed(1)}%)</span></div>`;
            }
            html += `</div>`;
          });

          if (month.transactions.length > 1) {
            html += `<div style="padding-top:6px;border-top:1px solid rgba(128,128,128,0.3);font-weight:600;">
              <div style="color:#93c5fd;">Total invested: ₹${month.totalInvested.toLocaleString('en-IN')}</div>`;
            if (gain !== null && gainPct !== null) {
              html += `<div style="color:${gainColor};">Now: ₹${Math.round(month.totalValuation).toLocaleString('en-IN')} (${gain >= 0 ? '+' : ''}${gainPct.toFixed(1)}%)</div>`;
            }
            html += `</div>`;
          } else if (gain !== null && gainPct !== null) {
            html += `<div style="color:${gainColor};font-weight:600;">${gain >= 0 ? '+' : ''}${gainPct.toFixed(1)}% gain</div>`;
          }

          return html + `</div>`;
        },
      },
      plotOptions: {
        column: {
          grouping: true,
          pointPadding: 0.05,
          groupPadding: 0.15,
          borderWidth: 0,
          borderRadius: 4,
        },
      },
      series: [
        {
          type: 'column',
          name: 'Amount Invested',
          data: months.map((m) => m.totalInvested),
          color: {
            linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
            stops: [
              [0, '#60a5fa'],
              [1, '#2563eb'],
            ],
          },
        },
        ...(currentGoldPrice !== null
          ? [
              {
                type: 'column',
                name: 'Current Valuation',
                data: months.map((m) => m.totalValuation),
                color: {
                  linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                  stops: [
                    [0, '#4ade80'],
                    [1, '#16a34a'],
                  ],
                },
              },
            ]
          : []),
      ],
      credits: { enabled: false },
      legend: {
        enabled: true,
        itemStyle: { color: textColor, fontWeight: 'normal', fontSize: '12px' },
        itemHoverStyle: { color: theme === 'dark' ? '#fff' : '#000' },
      },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
            label="Avg vs Current Price"
            valueClassName="text-xl"
            value={
              <>
                <div>Avg: ₹{goldStats.avgPrice.toFixed(2)}</div>
                <div>Current: ₹{goldStats.currentPrice.toFixed(2)}</div>
              </>
            }
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
      ) : filteredRates.length === 0 ? (
        <div className="bg-card rounded-lg p-4 relative">
          <div className="flex flex-wrap items-center gap-2 justify-end mb-3">
            <Tabs value={timeframe} onValueChange={setTimeframe} className="min-w-0">
              <TabsList className="bg-transparent p-0 h-auto gap-1 flex flex-wrap">
                {TIMEFRAMES.map((tf) => (
                  <TabsTrigger
                    key={tf.label}
                    value={tf.label}
                    className="border border-yellow-400 text-yellow-400 rounded-md px-2 py-0.5
                       text-xs font-normal min-w-[28px] h-7 transition-colors duration-150
                       data-[state=active]:bg-yellow-400 data-[state=active]:text-black
                       data-[state=active]:border-yellow-400 data-[state=active]:shadow-none
                       focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    {tf.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="h-[500px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm">No gold rate data for this timeframe</p>
            <p className="text-xs opacity-60">Try selecting a longer period or check back later</p>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-lg p-4 relative">
          {/* MOBILE: controls above chart, no overlap */}
          <div className="mb-3 flex flex-wrap items-center gap-2 sm:hidden">
            <Toggle
              pressed={showInvestmentPlotLines}
              onPressedChange={setShowInvestmentPlotLines}
              className="h-7 px-2 rounded-md border border-yellow-400 text-yellow-400
                 data-[state=on]:bg-yellow-400 data-[state=on]:text-black"
            >
              Transactions
            </Toggle>

            <Tabs value={timeframe} onValueChange={setTimeframe} className="min-w-0">
              <TabsList className="bg-transparent p-0 h-auto gap-1 flex flex-wrap">
                {TIMEFRAMES.map((tf) => (
                  <TabsTrigger
                    key={tf.label}
                    value={tf.label}
                    className="border border-yellow-400 text-yellow-400 rounded-md px-2 py-0.5
                       text-[11px] font-normal min-w-[28px] h-7 transition-colors duration-150
                       data-[state=active]:bg-yellow-400 data-[state=active]:text-black
                       data-[state=active]:border-yellow-400 data-[state=active]:shadow-none
                       focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    {tf.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* DESKTOP: overlay top-right */}
          <div className="hidden sm:flex absolute right-6 top-6 z-10 items-center gap-2">
            <Toggle
              pressed={showInvestmentPlotLines}
              onPressedChange={setShowInvestmentPlotLines}
              className="h-7 px-2 rounded-md border border-yellow-400 text-yellow-400
                 data-[state=on]:bg-yellow-400 data-[state=on]:text-black"
            >
              Transactions
            </Toggle>

            <Tabs value={timeframe} onValueChange={setTimeframe} className="min-w-0">
              <TabsList className="bg-transparent p-0 h-auto gap-1 flex flex-wrap">
                {TIMEFRAMES.map((tf) => (
                  <TabsTrigger
                    key={tf.label}
                    value={tf.label}
                    className="border border-yellow-400 text-yellow-400 rounded-md px-2 py-0.5
                       text-xs font-normal min-w-[28px] h-7 transition-colors duration-150
                       data-[state=active]:bg-yellow-400 data-[state=active]:text-black
                       data-[state=active]:border-yellow-400 data-[state=active]:shadow-none
                       focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
