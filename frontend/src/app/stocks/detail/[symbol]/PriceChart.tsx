'use client';

import { useState, useMemo } from 'react';
import { useStockFullProfile } from '@/api/query/stocks';
import { useAppStore } from '@/store/useAppStore';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { INTERVALS, Interval } from './verdicts';

interface Props {
  symbol: string;
}

export default function PriceChart({ symbol }: Props) {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  const [selectedInterval, setSelectedInterval] = useState<Interval>(INTERVALS[0]);

  const { data: chartProfileData, isLoading } = useStockFullProfile(
    symbol,
    selectedInterval.range,
    selectedInterval.interval
  );

  const chartOptions = useMemo(() => {
    const result = chartProfileData?.chartData?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

    // For intraday (1D), filter to latest trading day only, during market hours (09:00 to 16:00 IST)
    const isIntraday = selectedInterval.range === '1d';

    // First pass: collect all valid intraday data
    let tempData: [number, number][] = [];
    timestamps.forEach((ts: number, i: number) => {
      const close = closes[i];
      if (!close) return;
      const timeMs = ts * 1000;

      // Filter out non-market hours for intraday
      if (isIntraday) {
        const date = new Date(timeMs);
        const hours = date.getHours();
        // NSE market hours: 09:15 to 15:30 (roughly 09:00 to 16:00 to include pre/post)
        if (hours < 9 || hours >= 16) return;
      }

      tempData.push([timeMs, close]);
    });

    // For 1D, only keep data from the latest trading day
    let data = tempData;
    if (isIntraday && tempData.length > 0) {
      const latestTimestamp = tempData[tempData.length - 1][0];
      const latestDate = new Date(latestTimestamp);
      const latestDateStr = latestDate.toLocaleDateString();

      data = tempData.filter(([timeMs]) => {
        const date = new Date(timeMs);
        return date.toLocaleDateString() === latestDateStr;
      });
    }

    if (data.length === 0) return null;

    const firstClose = closes.find((c): c is number => c !== null);
    const lastClose = [...closes].reverse().find((c): c is number => c !== null);
    const seriesColor = (lastClose ?? 0) >= (firstClose ?? 0) ? '#16a34a' : '#dc2626';

    const textColor = isDark ? '#d1d5db' : '#6b7280';
    const titleColor = isDark ? '#fff' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const borderColor = isDark ? '#4b5563' : '#d1d5db';
    const bgColor = isDark ? '#1f2937' : 'rgba(255,255,255,0.95)';

    return {
      chart: {
        type: 'line',
        height: 380,
        backgroundColor: 'transparent',
        style: { fontFamily: 'inherit' },
      },
      title: { text: null },
      xAxis: {
        type: 'datetime',
        labels: {
          style: { color: textColor },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            // Convert UTC to IST (UTC+5:30)
            const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
            const istTime = (this.value as number) + istOffset;

            // For intraday (1D, 1W), show only time; for longer ranges, show date
            const isIntraday = selectedInterval.range === '1d' || selectedInterval.range === '1w';
            if (isIntraday) {
              return Highcharts.dateFormat('%H:%M', istTime);
            }
            return Highcharts.dateFormat('%e %b', istTime);
          },
        },
        gridLineWidth: 1,
        gridLineColor: gridColor,
        lineColor: borderColor,
      },
      yAxis: {
        title: { text: null },
        labels: {
          style: { color: textColor },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            return '₹' + Highcharts.numberFormat(this.value as number, 0);
          },
        },
        gridLineWidth: 1,
        gridLineColor: gridColor,
      },
      tooltip: {
        backgroundColor: bgColor,
        borderColor,
        borderRadius: 8,
        shadow: true,
        useHTML: true,
        style: { color: titleColor },
        formatter: function (this: unknown): string {
          // @ts-expect-error highcharts
          return `<b>${Highcharts.dateFormat('%e %b %Y %H:%M', this.x as number)}</b><br/>₹${Highcharts.numberFormat(this.y as number, 2)}`;
        },
      },
      legend: { enabled: false },
      plotOptions: {
        line: {
          animation: { duration: 600 },
          marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
          states: { hover: { lineWidth: 3 } },
        },
      },
      series: [{ name: 'Price', data, color: seriesColor, lineWidth: 2 }],
      credits: { enabled: false },
    };
  }, [chartProfileData, isDark]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Price Chart</CardTitle>
          <Tabs
            value={selectedInterval.label}
            onValueChange={(v) =>
              setSelectedInterval(INTERVALS.find((i) => i.label === v) ?? INTERVALS[0])
            }
          >
            <TabsList className="bg-transparent p-0 h-auto gap-1">
              {INTERVALS.map((iv) => (
                <TabsTrigger
                  key={iv.label}
                  value={iv.label}
                  className="border border-gray-400 text-gray-400 rounded-md px-2 py-0.5 text-xs font-normal min-w-[28px] h-7 transition-colors duration-150 data-[state=active]:bg-gray-400 data-[state=active]:text-black data-[state=active]:border-gray-400 data-[state=active]:shadow-none"
                >
                  {iv.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[380px] w-full" />
        ) : chartOptions ? (
          <HighchartsReact
            highcharts={Highcharts}
            options={chartOptions}
            key={`${symbol}-${selectedInterval.label}`}
          />
        ) : (
          <div className="h-[380px] flex items-center justify-center text-muted-foreground text-sm">
            Chart data unavailable for this interval
          </div>
        )}
      </CardContent>
    </Card>
  );
}
