'use client';

import { useState, useMemo } from 'react';
import { useSafeGoldRatesQuery, useGoldTransactionsQuery } from '@/api/query';
import { useAppStore } from '@/store/useAppStore';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import xirr, { XirrTransaction } from '@/utils/xirr';
import { getPastDate, getTimeframes } from '@/utils/chartHelpers';
import { formatCurrency } from '@/utils/numbers';

export default function GoldPortfolioPage() {
  const { theme } = useAppStore();
  const TIMEFRAMES = getTimeframes();
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1].label); // default '1m'
  const endDate = new Date().toISOString().slice(0, 10);
  const selectedTimeframe = TIMEFRAMES.find((tf) => tf.label === timeframe) || TIMEFRAMES[1];
  const startDate = getPastDate(selectedTimeframe.days, 'ymd');

  const { data, isLoading, error } = useSafeGoldRatesQuery({ startDate, endDate });
  const { data: transactions } = useGoldTransactionsQuery();

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

  // Investment events and cumulative invested chart options
  const investmentChartOptions = useMemo(() => {
    if (!transactions || transactions.length === 0) return {};
    // Sort transactions by date ascending
    const sortedTx = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    // Only consider credits for investment events
    const investmentEvents = sortedTx.filter((tx) => tx.type === 'credit');
    // Prepare data for columns (investment events)
    const eventData = investmentEvents.map((tx) => [Date.parse(tx.date), tx.amount]);
    // Prepare data for cumulative invested (line)
    let cumulative = 0;
    const cumulativeData = sortedTx.map((tx) => {
      if (tx.type === 'credit') cumulative += tx.amount;
      else if (tx.type === 'debit') cumulative -= tx.amount;
      return [Date.parse(tx.date), cumulative];
    });
    return {
      chart: { type: 'line', backgroundColor: 'transparent', height: 320 },
      title: {
        text: 'Gold Investment Timeline',
        style: {
          fontWeight: 600,
          fontSize: '1.1rem',
          color: theme === 'dark' ? '#fff' : '#18181b',
        },
      },
      xAxis: {
        type: 'datetime',
        labels: {
          format: '{value:%d %b %Y}',
          style: { color: theme === 'dark' ? '#FFF' : '#18181b' },
        },
        title: { text: 'Date', style: { color: theme === 'dark' ? '#FFF' : '#18181b' } },
      },
      yAxis: [
        {
          title: {
            text: 'Investment (₹)',
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
        useHTML: true,
        formatter: function (this: unknown) {
          // Highcharts context is not typed, so we use unknown and cast as needed
          const self = this as { points?: { series: { name: string }; y: number }[]; x: number };
          const points = self.points || [];
          const date = Highcharts.dateFormat('%d %b %Y', self.x);
          let invested: number | null = null;
          let total: number | null = null;
          points.forEach((pt: unknown) => {
            const point = pt as { series: { name: string }; y: number };
            if (point.series.name === 'Investment Event' && typeof point.y === 'number')
              invested = point.y;
            if (point.series.name === 'Cumulative Invested' && typeof point.y === 'number')
              total = point.y;
          });
          return `
            <div style="min-width:160px; color: ${theme === 'dark' ? '#fff' : '#18181b'};">
              <div style="font-weight:600; margin-bottom:4px;">${date}</div>
              ${invested !== null ? `<div>Invested this day: <b>₹${Number(invested).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></div>` : ''}
              ${total !== null ? `<div>Total invested: <b>₹${Number(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></div>` : ''}
            </div>
          `;
        },
      },
      series: [
        {
          type: 'column',
          name: 'Investment Event',
          data: eventData,
          color: '#60a5fa',
          yAxis: 0,
          tooltip: { valuePrefix: '₹' },
        },
        {
          type: 'line',
          name: 'Cumulative Invested',
          data: cumulativeData,
          color: '#fbbf24',
          lineWidth: 2,
          marker: { enabled: false },
          yAxis: 0,
          tooltip: { valuePrefix: '₹' },
        },
      ],
      credits: { enabled: false },
    };
  }, [transactions, theme]);

  return (
    <div className="p-4 h-full">
      <h2 className="text-2xl font-bold mb-6 text-center">Gold Portfolio</h2>
      {/* Portfolio Summary Cards */}
      {goldStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <SummaryStatCard label="Total Gold (gms)" value={goldStats.totalGold.toFixed(4)} />
          <SummaryStatCard label="Total Invested" value={formatCurrency(goldStats.totalInvested)} />
          <SummaryStatCard
            label={
              <>
                {goldStats.profitLoss >= 0 ? 'Current Profit' : 'Current Loss'}{' '}
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
      )}
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
        {isLoading ? (
          <div className="text-center">Loading chart...</div>
        ) : error ? (
          <div className="text-center text-red-500">Failed to load gold rates</div>
        ) : (
          <HighchartsReact
            highcharts={Highcharts}
            options={chartOptions}
            containerProps={{ style: { height: '100%' } }}
          />
        )}
      </div>
      {/* Investment Timeline Chart */}
      <div className="bg-card rounded-lg p-4 mt-6">
        <HighchartsReact
          highcharts={Highcharts}
          options={investmentChartOptions}
          containerProps={{ style: { height: 320 } }}
        />
      </div>
    </div>
  );
}
