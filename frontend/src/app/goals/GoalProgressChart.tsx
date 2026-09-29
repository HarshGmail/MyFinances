'use client';

import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { GoalView, ValuePoint } from '@myfinances/core/calc/goals';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { formatCompactRupees } from './goalDisplay';

const INVESTED_COLOR = '#3B82F6';
const CURRENT_COLOR = '#22C55E';
const PROJECTION_COLOR = '#8B5CF6';
const REQUIRED_COLOR = '#F97316';
const TARGET_COLOR = '#EF4444';
const TARGET_HEADROOM = 1.05;

function toSeriesData(points: ValuePoint[]): [number, number][] {
  return points.map((point) => [point.date.getTime(), Math.round(point.value)]);
}

export function GoalProgressChart({ view }: { view: GoalView }) {
  const theme = useAppStore((state) => state.theme);

  const options = useMemo<Highcharts.Options>(() => {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#fff' : '#18181b';
    const mutedColor = isDark ? '#d1d5db' : '#6b7280';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const targetDate = new Date(view.goal.targetDate).getTime();

    return {
      chart: {
        height: 380,
        backgroundColor: 'transparent',
        style: { fontFamily: 'inherit' },
      },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        type: 'datetime',
        labels: { style: { color: mutedColor } },
        lineColor: gridColor,
        tickColor: gridColor,
        plotLines: [
          {
            value: targetDate,
            color: TARGET_COLOR,
            dashStyle: 'ShortDot',
            width: 1,
            label: { text: 'Target date', style: { color: mutedColor }, rotation: 0, y: 12 },
          },
        ],
      },
      yAxis: {
        title: { text: undefined },
        min: 0,
        softMax: view.targetAmount * TARGET_HEADROOM,
        gridLineColor: gridColor,
        labels: {
          style: { color: mutedColor },
          formatter(this: Highcharts.AxisLabelsFormatterContextObject) {
            return formatCompactRupees(this.value as number);
          },
        },
        plotLines: [
          {
            value: view.targetAmount,
            color: TARGET_COLOR,
            width: 2,
            zIndex: 4,
            label: {
              text: `Target ${formatCompactRupees(view.targetAmount)}`,
              align: 'left',
              style: { color: textColor, fontWeight: '600' },
            },
          },
        ],
      },
      tooltip: {
        shared: true,
        xDateFormat: '%b %Y',
        backgroundColor: isDark ? '#1f2937' : 'rgba(255, 255, 255, 0.95)',
        borderColor: gridColor,
        style: { color: textColor },
        pointFormatter(this: Highcharts.Point) {
          return `<span style="color:${this.color}">●</span> ${this.series.name}: <b>${formatCurrency(this.y ?? 0)}</b><br/>`;
        },
      },
      legend: {
        itemStyle: { color: mutedColor, fontWeight: '500' },
        itemHoverStyle: { color: textColor },
      },
      plotOptions: {
        series: {
          marker: { enabled: false, states: { hover: { enabled: true } } },
          animation: { duration: 600 },
        },
      },
      series: [
        {
          type: 'line',
          name: 'Invested',
          step: 'left',
          data: toSeriesData(view.investedSeries),
          color: INVESTED_COLOR,
        },
        {
          type: 'line',
          name: 'Projection',
          data: toSeriesData(view.projection),
          color: PROJECTION_COLOR,
          dashStyle: 'Dash',
        },
        {
          type: 'line',
          name: 'Required path',
          data: toSeriesData(view.requiredPath),
          color: REQUIRED_COLOR,
          dashStyle: 'ShortDash',
          visible: view.requiredPath.length > 0,
          showInLegend: view.requiredPath.length > 0,
        },
        {
          type: 'scatter',
          name: 'Current value',
          data: [[Date.now(), Math.round(view.value.currentValue)]],
          color: CURRENT_COLOR,
          marker: { enabled: true, radius: 6, symbol: 'circle' },
          zIndex: 5,
        },
      ],
    };
  }, [theme, view]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress & projection</CardTitle>
        <p className="text-sm text-muted-foreground">
          What you have put in so far, where today&apos;s value lands at your current pace, and the
          path that would reach the target exactly.
        </p>
      </CardHeader>
      <CardContent>
        <HighchartsReact highcharts={Highcharts} options={options} />
      </CardContent>
    </Card>
  );
}
