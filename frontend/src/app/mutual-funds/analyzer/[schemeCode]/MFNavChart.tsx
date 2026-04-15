'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Highcharts from 'highcharts/highstock';
import { MutualFundNavHistoryData } from '@/api/dataInterface';
import { MF_INTERVALS, filterNavDataByInterval } from './mfVerdicts';
import { useAppStore } from '@/store/useAppStore';
import { Skeleton } from '@/components/ui/skeleton';

const HighchartsReact = dynamic(() => import('highcharts-react-official'), { ssr: false });

interface MFNavChartProps {
  navData?: MutualFundNavHistoryData[];
  isLoading: boolean;
}

function parseNavDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function MFNavChart({ navData, isLoading }: MFNavChartProps) {
  const [selectedInterval, setSelectedInterval] = useState(0); // Index into MF_INTERVALS
  const theme = useAppStore((state) => state.theme);

  const chartOptions = useMemo(() => {
    if (!navData || navData.length === 0) return null;

    const interval = MF_INTERVALS[selectedInterval];
    const filteredData = filterNavDataByInterval(navData, interval.days);

    if (filteredData.length === 0) {
      return null;
    }

    // Reverse to get chronological order (oldest to newest)
    const chartData = filteredData.reverse().map((item) => {
      const date = parseNavDate(item.date);
      const nav = parseFloat(item.nav);
      return [date.getTime(), nav];
    });

    // Determine color based on performance
    const startNav = parseFloat(filteredData[0].nav);
    const endNav = parseFloat(filteredData[filteredData.length - 1].nav);
    const color = endNav >= startNav ? '#16a34a' : '#dc2626'; // green or red

    const textColor = theme === 'dark' ? '#ffffff' : '#18181b';

    return {
      chart: {
        type: 'line',
        backgroundColor: 'transparent',
        height: 400,
      },
      title: null,
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        type: 'datetime',
        labels: {
          style: { color: textColor, fontSize: '12px' },
        },
        gridLineColor: 'rgba(200, 200, 200, 0.1)',
      },
      yAxis: {
        labels: {
          style: { color: textColor, fontSize: '12px' },
        },
        gridLineColor: 'rgba(200, 200, 200, 0.1)',
        title: { text: 'NAV (₹)', style: { color: textColor } },
      },
      tooltip: {
        valueDecimals: 2,
        headerFormat: '<strong>{point.x:%d-%b-%Y}</strong><br/>',
        pointFormat: 'NAV: ₹{point.y:.2f}',
        backgroundColor: theme === 'dark' ? '#27272a' : '#ffffff',
        borderColor: theme === 'dark' ? '#52525b' : '#e5e7eb',
        style: { color: textColor },
      },
      series: [
        {
          data: chartData,
          color,
          name: 'NAV',
          lineWidth: 2,
          marker: { enabled: false },
        },
      ],
    };
  }, [navData, selectedInterval, theme]);

  if (isLoading || !navData) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!chartOptions) {
    return (
      <div className="h-96 flex items-center justify-center border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No chart data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {MF_INTERVALS.map((interval, idx) => (
          <button
            key={interval.label}
            onClick={() => setSelectedInterval(idx)}
            className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${
              selectedInterval === idx
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-muted-foreground/20 hover:bg-muted text-muted-foreground'
            }`}
          >
            {interval.label}
          </button>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      </div>
    </div>
  );
}
