'use client';

import React, { useMemo, useState } from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import { useAppStore } from '@/store/useAppStore';

interface GoldRateData {
  date: string;
  rate: string;
}

interface GoldPriceChartAnalyzerProps {
  ratesData: GoldRateData[];
}

const INTERVALS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 365 * 3 },
  { label: '5Y', days: 365 * 5 },
  { label: 'All', days: null },
];

function parseGoldDate(dateStr: string): Date {
  return new Date(dateStr);
}

function getDateNDaysAgo(refDate: Date, days: number): Date {
  const d = new Date(refDate);
  d.setTime(d.getTime() - days * 24 * 60 * 60 * 1000);
  return d;
}

function filterPriceDataByInterval(
  data: Array<{ date: string; price: number }>,
  days: number | null
): Array<{ date: string; price: number }> {
  if (!data.length || !days) return data;

  const currentDate = parseGoldDate(data[0].date);
  const cutoffDate = getDateNDaysAgo(currentDate, days);

  return data.filter((item) => parseGoldDate(item.date) >= cutoffDate);
}

export default function GoldPriceChartAnalyzer({ ratesData }: GoldPriceChartAnalyzerProps) {
  const [selectedInterval, setSelectedInterval] = useState('1Y');
  const { theme } = useAppStore();

  const priceData = useMemo(
    () =>
      ratesData.map((d) => ({
        date: d.date,
        price: parseFloat(d.rate),
      })),
    [ratesData]
  );

  const filteredData = useMemo(() => {
    const interval = INTERVALS.find((i) => i.label === selectedInterval);
    return filterPriceDataByInterval(priceData, interval?.days || null);
  }, [priceData, selectedInterval]);

  const chartOptions = useMemo(() => {
    if (filteredData.length === 0) {
      return {};
    }

    const startPrice = filteredData[filteredData.length - 1].price;
    const endPrice = filteredData[0].price;
    const isPositive = endPrice >= startPrice;
    const color = isPositive ? '#16a34a' : '#dc2626';

    const seriesData = filteredData
      .slice()
      .reverse()
      .map((item) => ({
        x: new Date(item.date).getTime(),
        y: item.price,
      }));

    const textColor = theme === 'dark' ? '#fff' : '#18181b';
    const gridColor = theme === 'dark' ? '#404040' : '#e4e4e7';

    return {
      chart: {
        type: 'line',
        height: 400,
        backgroundColor: 'transparent',
      },
      title: { text: undefined },
      xAxis: {
        type: 'datetime',
        labels: {
          style: { color: textColor },
          formatter: function (this: any) {
            return Highcharts.dateFormat('%d %b', this.value);
          },
        },
        gridLineColor: gridColor,
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          style: { color: textColor },
        },
        gridLineColor: gridColor,
      },
      tooltip: {
        shared: true,
        valuePrefix: '₹',
        valueDecimals: 2,
      },
      legend: { enabled: false },
      credits: { enabled: false },
      series: [
        {
          type: 'line',
          name: 'Gold Price (₹/g)',
          data: seriesData,
          color: color,
          lineWidth: 2,
          states: {
            hover: { lineWidth: 3 },
          },
        },
      ],
    } as Highcharts.Options;
  }, [filteredData, theme]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {INTERVALS.map((interval) => (
          <button
            key={interval.label}
            onClick={() => setSelectedInterval(interval.label)}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              selectedInterval === interval.label
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {interval.label}
          </button>
        ))}
      </div>

      {filteredData.length > 0 ? (
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      ) : (
        <div className="h-96 flex items-center justify-center text-muted-foreground">
          No data available for selected period
        </div>
      )}
    </div>
  );
}
