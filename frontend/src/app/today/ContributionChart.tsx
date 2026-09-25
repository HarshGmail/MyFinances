'use client';

import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { ASSET_CLASS_LABELS, AssetMove } from '@/utils/dailyMoves';
import { formatSignedCurrency, formatSignedPercent } from './formatMove';

const GAIN_COLOR = '#16a34a';
const LOSS_COLOR = '#dc2626';
const BAR_HEIGHT_PX = 48;
const CHART_PADDING_PX = 60;

export default function ContributionChart({ moves }: { moves: AssetMove[] }) {
  const theme = useAppStore((state) => state.theme);

  const options = useMemo<Highcharts.Options>(() => {
    const textColor = theme === 'dark' ? '#fff' : '#18181b';
    const mutedColor = theme === 'dark' ? '#a1a1aa' : '#71717a';
    const gridColor = theme === 'dark' ? '#3f3f46' : '#e4e4e7';
    const sorted = [...moves].sort((a, b) => b.change - a.change);

    return {
      chart: {
        type: 'bar',
        backgroundColor: 'transparent',
        height: sorted.length * BAR_HEIGHT_PX + CHART_PADDING_PX,
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        categories: sorted.map((m) => ASSET_CLASS_LABELS[m.assetClass]),
        labels: { style: { color: textColor, fontSize: '13px' } },
        lineWidth: 0,
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: gridColor,
        labels: {
          style: { color: mutedColor },
          formatter() {
            return formatSignedCurrency(Number(this.value)).replace(/\.\d+$/, '');
          },
        },
        plotLines: [{ value: 0, color: mutedColor, width: 1, zIndex: 3 }],
      },
      tooltip: {
        formatter() {
          const move = sorted[this.index];
          return `<b>${ASSET_CLASS_LABELS[move.assetClass]}</b><br/>${formatSignedCurrency(
            move.change
          )} (${formatSignedPercent(move.changePct)})`;
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          borderWidth: 0,
          pointPadding: 0.15,
          groupPadding: 0.1,
          dataLabels: {
            enabled: true,
            style: { color: textColor, textOutline: 'none', fontWeight: '500' },
            formatter() {
              return formatSignedCurrency(Number(this.y));
            },
          },
        },
      },
      series: [
        {
          type: 'bar',
          name: "Today's change",
          data: sorted.map((m) => ({
            y: Number(m.change.toFixed(2)),
            color: m.change >= 0 ? GAIN_COLOR : LOSS_COLOR,
          })),
        },
      ],
    };
  }, [moves, theme]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>What drove today</CardTitle>
        <p className="text-sm text-muted-foreground">
          Rupee contribution of each asset class to today&apos;s move.
        </p>
      </CardHeader>
      <CardContent>
        <HighchartsReact highcharts={Highcharts} options={options} />
      </CardContent>
    </Card>
  );
}
