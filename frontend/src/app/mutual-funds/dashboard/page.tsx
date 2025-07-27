'use client';

import {
  useMutualFundInfoFetchQuery,
  useMfapiNavHistoryBatchQuery,
} from '@/api/query/mutual-funds-info';
import { useMutualFundTransactionsQuery } from '@/api/query/mutual-funds';
import { useMemo } from 'react';
import groupBy from 'lodash/groupBy';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import xirr, { XirrTransaction as XirrCashFlow } from '@/utils/xirr';
import { SummaryStatCard } from '@/components/custom/SummaryStatCard';
import dynamic from 'next/dynamic';
import Highcharts from 'highcharts/highstock';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency } from '@/utils/numbers';
import { getProfitLossColor } from '@/utils/text';

const HighchartsReact = dynamic(() => import('highcharts-react-official'), { ssr: false });

export default function MutualFundsDashboardPage() {
  const { data: mfInfoData, isLoading: mfInfoLoading } = useMutualFundInfoFetchQuery();
  const { data: mutualFundsTransactionsData, isLoading: transactionsLoading } =
    useMutualFundTransactionsQuery();

  // Get unique schemeNumbers
  const schemeNumbers = useMemo(() => {
    if (!mfInfoData) return [];
    return Array.from(new Set(mfInfoData.map((info) => info.schemeNumber)));
  }, [mfInfoData]);

  // Use batch query to fetch all NAVs in parallel
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

  // Group transactions by fundName
  const grouped = useMemo(() => {
    if (!mutualFundsTransactionsData) return {};
    return groupBy(mutualFundsTransactionsData, 'fundName');
  }, [mutualFundsTransactionsData]);

  // Prepare table data
  const tableData = useMemo(() => {
    if (!mutualFundsTransactionsData || !mfInfoData) return [];
    return Object.entries(grouped).map(([fundName, txs]) => {
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
      // XIRR calculation for this fund
      let fundXirr: number | null = null;
      if (txs.length > 0 && currentValue !== null) {
        const cashFlows: XirrCashFlow[] = txs.map((tx) => ({
          amount: tx.type === 'credit' ? -tx.amount : tx.amount,
          when: new Date(tx.date),
        }));
        cashFlows.push({ amount: currentValue, when: new Date() });
        try {
          fundXirr = xirr(cashFlows) * 100;
        } catch {
          fundXirr = null;
        }
      }
      return {
        fundName,
        totalUnits,
        totalInvested,
        currentNav,
        currentValue,
        profitLoss,
        profitLossPercentage,
        fundXirr,
      };
    });
  }, [grouped, mfInfoData, mutualFundsTransactionsData, navDataMap]);

  // Summary calculations for cards
  const summary = useMemo(() => {
    const totalInvested = tableData.reduce((sum, row) => sum + row.totalInvested, 0);
    const totalCurrentValue = tableData.reduce((sum, row) => sum + (row.currentValue ?? 0), 0);
    // XIRR for all funds combined
    let allTxs: XirrCashFlow[] = [];
    if (mutualFundsTransactionsData && tableData.length > 0) {
      allTxs = mutualFundsTransactionsData.map((tx) => ({
        amount: tx.type === 'credit' ? -tx.amount : tx.amount,
        when: new Date(tx.date),
      }));
      allTxs.push({ amount: totalCurrentValue, when: new Date() });
    }
    let xirrValue: number | null = null;
    if (allTxs.length > 1) {
      try {
        xirrValue = xirr(allTxs) * 100;
      } catch {
        xirrValue = null;
      }
    }
    return {
      totalInvested,
      totalCurrentValue,
      xirrValue,
    };
  }, [tableData, mutualFundsTransactionsData]);
  // today, week and pie chart

  const getProfitLossBadgeVariant = (profitLoss: number | null) => {
    if (profitLoss === null) return 'default';
    return profitLoss >= 0 ? 'default' : 'destructive';
  };

  // Update chartSeries to always show all MFs
  const chartSeries = useMemo(() => {
    if (!mfInfoData || !mutualFundsTransactionsData || !navHistoryBatch) return [];
    // We'll build cumulative data as we build each fund's series
    const cumulativeMap: Record<number, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const allSeries = mfInfoData
      .map((info) => {
        const fundName = info.fundName;
        const schemeNumber = info.schemeNumber;
        const navData = navHistoryBatch?.[schemeNumber];
        if (!navData || !navData.data) return null;
        const navHistory = navData.data; // Array of { date: 'dd-mm-yyyy', nav: '...' }, latest first
        // Get all transactions for this fund, sorted by date ascending
        const txs = mutualFundsTransactionsData
          .filter((tx) => tx.fundName === fundName)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (txs.length === 0) return null;
        // Find first and last transaction dates
        const firstTxDate = new Date(txs[0].date);
        // Build a map of date (yyyy-mm-dd) -> cumulative units
        const dateToUnits: Record<string, number> = {};
        let cumulativeUnits = 0;
        let txIdx = 0;
        // Build a list of all dates from firstTxDate to today
        const allDates: string[] = [];
        for (let d = new Date(firstTxDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          // Add units for all transactions on this date
          while (
            txIdx < txs.length &&
            new Date(txs[txIdx].date).toDateString() === d.toDateString()
          ) {
            cumulativeUnits += txs[txIdx].numOfUnits;
            txIdx++;
          }
          dateToUnits[dateStr] = cumulativeUnits;
          allDates.push(dateStr);
        }
        // Prepare a map of nav date (yyyy-mm-dd) -> nav value
        const navMap: Record<string, number> = {};
        navHistory.forEach((navPoint: { date: string; nav: string }) => {
          const [dd, mm, yyyy] = navPoint.date.split('-');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          navMap[dateStr] = parseFloat(navPoint.nav);
        });
        // For each date, find the NAV (use most recent available NAV if missing)
        let lastKnownNav = null;
        const seriesData: [number, number][] = [];
        for (const dateStr of allDates) {
          if (navMap[dateStr] !== undefined) {
            lastKnownNav = navMap[dateStr];
          }
          if (lastKnownNav !== null && dateToUnits[dateStr] > 0) {
            const timestamp = new Date(dateStr + 'T00:00:00').getTime();
            const valuation = Number((dateToUnits[dateStr] * lastKnownNav).toFixed(2));
            seriesData.push([timestamp, valuation]);
            // Accumulate for cumulativeSeriesData
            cumulativeMap[timestamp] = (cumulativeMap[timestamp] || 0) + valuation;
          }
        }
        return {
          name: fundName,
          data: [...seriesData],
          type: 'line',
          color: undefined, // Let Highcharts assign default color
          dashStyle: 'Solid',
          marker: { enabled: true },
        };
      })
      .filter(Boolean);
    // Build cumulativeSeriesData as sorted array of [timestamp, cumulativeValuation]
    const cumulativeSeriesData = Object.entries(cumulativeMap)
      .map(([timestamp, value]) => [Number(timestamp), value as number])
      .sort((a, b) => a[0] - b[0]);

    // Build cumulativeAmountInvested: [timestamp, cumulativeInvested] pairs
    const investmentMap: Record<number, number> = {};
    let runningTotal = 0;
    if (mutualFundsTransactionsData) {
      // Group all transactions by date (yyyy-mm-dd)
      const txsByDate: Record<string, number> = {};
      mutualFundsTransactionsData.forEach((tx) => {
        const d = new Date(tx.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        // Only consider 'credit' transactions as investments
        if (tx.type === 'credit') {
          txsByDate[dateStr] = (txsByDate[dateStr] || 0) + tx.amount;
        }
      });
      // For each date (sorted), accumulate running total
      Object.keys(txsByDate)
        .sort()
        .forEach((dateStr) => {
          runningTotal += txsByDate[dateStr];
          const timestamp = new Date(dateStr + 'T00:00:00').getTime();
          investmentMap[timestamp] = runningTotal;
        });
    }
    const cumulativeAmountInvested = Object.entries(investmentMap)
      .map(([timestamp, value]) => [Number(timestamp), value as number])
      .sort((a, b) => a[0] - b[0]);
    // You can use cumulativeAmountInvested elsewhere as needed
    console.log('cumulativeAmountInvested', cumulativeAmountInvested);

    // Fill gaps in cumulativeAmountInvested for all dates in cumulativeSeriesData
    const investedMap = new Map<number, number>(cumulativeAmountInvested as [number, number][]);
    let lastAmount = 0;
    const filledCumulativeAmountInvested: [number, number][] = cumulativeSeriesData.map(
      ([timestamp]) => {
        if (investedMap.has(timestamp)) {
          lastAmount = investedMap.get(timestamp)!;
        }
        return [timestamp, lastAmount];
      }
    );

    // Keep the per-fund chartSeries mapping for future use (do not remove)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const perFundChartSeries = mfInfoData
      ? mfInfoData
          .map((info) => {
            const fundName = info.fundName;
            const schemeNumber = info.schemeNumber;
            const navData = navHistoryBatch?.[schemeNumber];
            if (!navData || !navData.data) return null;
            const navHistory = navData.data;
            const txs = mutualFundsTransactionsData
              .filter((tx) => tx.fundName === fundName)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (txs.length === 0) return null;
            const firstTxDate = new Date(txs[0].date);
            const dateToUnits: Record<string, number> = {};
            let cumulativeUnits = 0;
            let txIdx = 0;
            const allDates: string[] = [];
            for (let d = new Date(firstTxDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              const dateStr = `${yyyy}-${mm}-${dd}`;
              while (
                txIdx < txs.length &&
                new Date(txs[txIdx].date).toDateString() === d.toDateString()
              ) {
                cumulativeUnits += txs[txIdx].numOfUnits;
                txIdx++;
              }
              dateToUnits[dateStr] = cumulativeUnits;
              allDates.push(dateStr);
            }
            const navMap: Record<string, number> = {};
            navHistory.forEach((navPoint: { date: string; nav: string }) => {
              const [dd, mm, yyyy] = navPoint.date.split('-');
              const dateStr = `${yyyy}-${mm}-${dd}`;
              navMap[dateStr] = parseFloat(navPoint.nav);
            });
            let lastKnownNav = null;
            const seriesData: [number, number][] = [];
            for (const dateStr of allDates) {
              if (navMap[dateStr] !== undefined) {
                lastKnownNav = navMap[dateStr];
              }
              if (lastKnownNav !== null && dateToUnits[dateStr] > 0) {
                const timestamp = new Date(dateStr + 'T00:00:00').getTime();
                seriesData.push([
                  timestamp,
                  Number((dateToUnits[dateStr] * lastKnownNav).toFixed(2)),
                ]);
              }
            }
            return {
              name: fundName,
              data: [...seriesData],
              type: 'line',
              color: undefined,
              dashStyle: 'Solid',
              marker: { enabled: true },
            };
          })
          .filter(Boolean)
      : [];

    // Only show cumulative lines in the chart for now
    const chartSeries = [
      {
        name: 'Total Portfolio Valuation',
        data: cumulativeSeriesData,
        type: 'line',
        color: '#3b82f6', // blue
        dashStyle: 'Solid',
        marker: { enabled: false },
      },
      {
        name: 'Cumulative Amount Invested',
        data: filledCumulativeAmountInvested,
        type: 'line',
        color: '#fbbf24', // yellow
        dashStyle: 'Solid',
        marker: { enabled: false },
      },
    ];
    return chartSeries;
  }, [mfInfoData, mutualFundsTransactionsData, navHistoryBatch]);

  const theme = useAppStore((s) => s.theme);

  // Remove Reset button and related logic from rangeSelectorButtons
  const chartOptions = useMemo(() => {
    const isDark = theme === 'dark';
    const rangeSelectorButtons = [
      { type: 'month', count: 1, text: '1m', title: 'View 1 month' },
      { type: 'month', count: 3, text: '3m', title: 'View 3 months' },
      { type: 'month', count: 6, text: '6m', title: 'View 6 months' },
      { type: 'ytd', text: 'YTD', title: 'View year to date' },
      { type: 'year', count: 1, text: '1y', title: 'View 1 year' },
      { type: 'all', text: 'All', title: 'View all' },
    ];
    return {
      chart: {
        type: 'line',
        backgroundColor: 'transparent',
        height: 400,
      },
      title: {
        text: 'Mutual Fund Valuation Growth',
        style: { fontWeight: 600, fontSize: '1.1rem', color: isDark ? '#fff' : '#18181b' },
      },
      rangeSelector: {
        selected: 6,
        inputEnabled: false,
        buttons: rangeSelectorButtons,
        buttonTheme: {
          fill: isDark ? '#232323' : '#fff',
          stroke: isDark ? '#444' : '#ccc',
          style: {
            color: isDark ? '#fff' : '#18181b',
          },
          states: {
            hover: {
              fill: isDark ? '#333' : '#f0f0f0',
              style: { color: isDark ? '#fff' : '#18181b' },
            },
            select: {
              fill: isDark ? '#444' : '#e0e0e0',
              style: { color: isDark ? '#fff' : '#18181b' },
            },
          },
        },
        labelStyle: { color: isDark ? '#fff' : '#18181b' },
      },
      xAxis: {
        type: 'datetime',
        labels: { style: { color: isDark ? '#ccc' : '#18181b' } },
        lineColor: isDark ? '#444' : '#ccc',
        tickColor: isDark ? '#444' : '#ccc',
      },
      yAxis: {
        title: { text: 'Valuation (₹)', style: { color: isDark ? '#fff' : '#18181b' } },
        labels: {
          style: { color: isDark ? '#ccc' : '#18181b' },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            return '₹' + this.value;
          },
        },
        min: 0,
        gridLineColor: isDark ? '#333' : '#e5e7eb', // dim grid lines in dark mode
      },
      tooltip: {
        shared: true,
        useHTML: true,
        formatter: function (this: unknown) {
          const self = this as {
            x: number;
            points?: { series: { name: string; color: string }; y: number }[];
          };
          let s = `<span style="font-size:1em;">${Highcharts.dateFormat('%d %b %Y', self.x)}</span><br/>`;
          (self.points || []).forEach((point) => {
            s += `<span style="color:${point.series.color};font-size:1.2em;">●</span> <span style="font-weight:500">${point.series.name}:</span> <b>₹${point.y?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b><br/>`;
          });
          return s;
        },
        backgroundColor: isDark ? '#18181b' : '#fff',
        style: { color: isDark ? '#fff' : '#18181b' },
        borderColor: isDark ? '#333' : '#ccc',
      },
      series: chartSeries,
      credits: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
      legend: {
        enabled: true,
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: {
          color: isDark ? '#fff' : '#18181b',
          fontWeight: 500,
        },
        symbolHeight: 12,
        symbolWidth: 12,
        symbolRadius: 6,
        itemMarginTop: 6,
        itemMarginBottom: 6,
      },
      plotOptions: {
        series: {
          events: {
            legendItemClick: function (this: Highcharts.Series) {
              const chart = this.chart;
              const visibleSeries = chart.series.filter((s) => s.visible);
              if (visibleSeries.length === 0) {
                // Only one series is visible and it's the clicked one: show all
                chart.series.forEach((s) => s.show());
              } else {
                // Hide all except the clicked one
                chart.series.forEach((s) => {
                  if (s === this) {
                    s.show();
                  } else {
                    s.hide();
                  }
                });
              }
              return false;
            },
          },
        },
      },
    };
  }, [chartSeries, theme]);

  // Loading and error states
  const isLoading = mfInfoLoading || transactionsLoading || navHistoryLoading;

  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Mutual Funds Dashboard</h2>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 mx-9 place-items-stretch">
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[120px]" />
          <Skeleton className="w-full h-[120px]" />
        </div>

        {/* Chart Skeleton */}
        <div className="bg-card rounded-lg p-4 mb-6">
          <Skeleton className="w-full h-[400px]" />
        </div>

        {/* Portfolio Table Skeleton */}
        <div className="max-w-7xl mx-auto">
          <div className="border rounded-lg">
            {/* Table Header Skeleton */}
            <div className="bg-muted/50 p-4 border-b">
              <div className="grid grid-cols-9 gap-4">
                {[
                  'S.No',
                  'Mutual Fund Name',
                  'Units',
                  'Amount Invested',
                  'Current NAV',
                  'Current Value',
                  'P&L (₹)',
                  'P&L %',
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
                  <div className="grid grid-cols-9 gap-4">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
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

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6 text-center">Mutual Funds Dashboard</h2>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 mx-9 place-items-stretch">
        <SummaryStatCard label="Total Invested" value={formatCurrency(summary.totalInvested)} />
        <SummaryStatCard
          label={
            <>
              Current Valuation{' '}
              <span
                className={
                  summary.totalCurrentValue - summary.totalInvested >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                (
                {formatCurrency(
                  Number((summary.totalCurrentValue - summary.totalInvested).toFixed(2))
                )}
                )
              </span>
            </>
          }
          value={
            <span
              className={
                summary.totalCurrentValue - summary.totalInvested >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }
            >
              {formatCurrency(Number(summary.totalCurrentValue.toFixed(2)))}{' '}
              <span>
                (
                {summary.totalInvested > 0
                  ? (
                      ((summary.totalCurrentValue - summary.totalInvested) /
                        summary.totalInvested) *
                      100
                    ).toFixed(2)
                  : '0.00'}
                %)
              </span>
            </span>
          }
        />
        <SummaryStatCard
          label="XIRR %"
          value={summary.xirrValue !== null ? `${summary.xirrValue.toFixed(2)}%` : 'N/A'}
          valueClassName={
            summary.xirrValue !== null && summary.xirrValue >= 0 ? 'text-green-600' : 'text-red-600'
          }
        />
      </div>
      {/* Mutual Fund Growth Chart */}
      {chartSeries.length > 0 && (
        <div className="bg-card rounded-lg p-4 mb-6">
          <HighchartsReact
            highcharts={Highcharts}
            constructorType="stockChart"
            options={chartOptions}
            containerProps={{ style: { height: 400 } }}
          />
        </div>
      )}
      {tableData.length > 0 ? (
        <div className="max-w-7xl mx-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.No</TableHead>
                <TableHead>Mutual Fund Name</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Amount Invested</TableHead>
                <TableHead>Current NAV</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>P&L (₹)</TableHead>
                <TableHead>P&L %</TableHead>
                <TableHead>XIRR %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, idx) => (
                <TableRow key={row.fundName}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium">{row.fundName}</TableCell>
                  <TableCell>{row.totalUnits.toFixed(2)}</TableCell>
                  <TableCell>
                    ₹{row.totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {row.currentNav !== null
                      ? `₹${row.currentNav.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {row.currentValue !== null
                      ? formatCurrency(Number(row.currentValue.toFixed(2)))
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {row.currentValue !== null && row.profitLoss !== null ? (
                      <span className={getProfitLossColor(row.profitLoss)}>
                        {formatCurrency(Number(row.profitLoss.toFixed(2)))}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {row.profitLossPercentage !== null ? (
                      <Badge variant={getProfitLossBadgeVariant(row.profitLoss)}>
                        {row.profitLossPercentage.toFixed(2)}%
                      </Badge>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {row.fundXirr !== null ? (
                      <Badge variant={row.fundXirr >= 0 ? 'default' : 'destructive'}>
                        {row.fundXirr.toFixed(2)}%
                      </Badge>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center text-muted-foreground">No mutual fund investments found.</div>
      )}
    </div>
  );
}
