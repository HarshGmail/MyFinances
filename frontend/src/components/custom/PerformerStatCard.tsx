import { Card } from '../ui/card';
import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { PlaceholderCards } from '../ui/placeholder-cards';

interface PerformerStatCardProps {
  label: string;
  performer: {
    currency: string;
    currentPrice: number | null;
    profitLoss: number;
    profitLossPercentage: number;
  };
  history: { x: number; y: number }[];
  weekStats: { change: number; high: number; low: number } | null;
  color: 'green' | 'red';
  symbol: string;
  loading?: boolean;
}

export function PerformerStatCard({
  label,
  performer,
  history,
  weekStats,
  color,
  symbol,
  loading = false,
}: PerformerStatCardProps) {
  if (loading) {
    return <PlaceholderCards count={1} className="h-[180px] min-h-[180px]" />;
  }
  const profitLossColor = color === 'green' ? 'text-green-600' : 'text-red-600';
  const sparklineColor = color === 'green' ? '#16a34a' : '#dc2626';
  const sparklineOptions = {
    chart: {
      type: 'line',
      backgroundColor: 'transparent',
      height: 40,
      margin: [2, 0, 2, 0],
    },
    title: { text: null },
    xAxis: { visible: false },
    yAxis: { visible: false },
    legend: { enabled: false },
    tooltip: {
      useHTML: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: function (this: any) {
        let dateStr = '';
        if (typeof this.x === 'number' && !isNaN(this.x)) {
          const d = new Date(this.x);
          if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
          } else {
            dateStr = '' + this.x;
          }
        }
        const price =
          typeof this.y === 'number'
            ? new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
              }).format(this.y)
            : this.y;
        return `<div style='font-size:0.75em;'>${dateStr}</div><div>${price}</div>`;
      },
      backgroundColor: '#18181b',
      style: { color: '#fff', fontSize: '0.9rem' },
      borderRadius: 6,
      borderWidth: 0,
      shadow: false,
      padding: 8,
    },
    credits: { enabled: false },
    plotOptions: {
      series: {
        color: sparklineColor,
        lineWidth: 2,
        marker: { enabled: false },
      },
    },
    series: [
      {
        data: history,
      },
    ],
  };
  return (
    <Card className="w-full min-w-[180px] flex flex-col py-8 min-h-[180px]">
      {/* Top label row */}
      <div className="w-full text-xs font-medium text-muted-foreground mb-2 pl-2">{label}</div>
      {/* Chart row */}
      <div className="w-full h-10 flex items-center justify-center mb-2">
        <HighchartsReact highcharts={Highcharts} options={sparklineOptions} />
      </div>
      {/* Content row (all text) */}
      <div className="flex flex-col justify-center flex-1 pl-4">
        <div className="text-lg font-bold flex items-center gap-1">
          {symbol}
          {performer.currentPrice !== null && (
            <span className="text-xs text-muted-foreground font-normal">
              (
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
              }).format(performer.currentPrice)}
              )
            </span>
          )}
        </div>
        <div className={`font-bold ${profitLossColor}`}>
          {new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
          }).format(performer.profitLoss)}{' '}
          ({performer.profitLossPercentage >= 0 ? '+' : ''}
          {performer.profitLossPercentage.toFixed(2)}%)
        </div>
        <div className="text-xs mt-2">
          {weekStats ? (
            <>
              <div>
                One week change: {weekStats.change >= 0 ? '+' : ''}
                {weekStats.change.toFixed(2)}%
              </div>
              <div>
                One Week High:{' '}
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 2,
                }).format(weekStats.high)}
              </div>
              <div>
                One Week Low:{' '}
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 2,
                }).format(weekStats.low)}
              </div>
            </>
          ) : (
            <div>
              <PlaceholderCards count={1} className="h-8 min-h-8" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
