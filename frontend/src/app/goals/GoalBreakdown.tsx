'use client';

import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { GOAL_ASSET_LABELS, type GoalLine, type GoalView } from '@myfinances/core/calc/goals';
import { formatCurrency, formatSignedCurrency } from '@myfinances/core/calc/numbers';
import { getProfitLossColor } from '@myfinances/core/calc/text';
import { MobileDataCard, MobileDataMetric } from '@/components/custom/MobileDataCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/store/useAppStore';
import { ASSET_COLORS, GOAL_MIX_KEYS, formatPercentNumber } from './goalDisplay';

const MISSING_HOLDING_NOTE = 'Holding not found (sold or renamed)';

function lineLabel(line: GoalLine): string {
  return line.holding?.label ?? line.allocation.assetKey;
}

function HoldingName({ line }: { line: GoalLine }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium">{lineLabel(line)}</div>
      {!line.holding && <div className="text-xs text-destructive">{MISSING_HOLDING_NOTE}</div>}
    </div>
  );
}

export function GoalBreakdown({ view }: { view: GoalView }) {
  const theme = useAppStore((state) => state.theme);
  const { lines, byType } = view.value;
  const manualAmount = view.goal.manualAmount ?? 0;

  const donutOptions = useMemo<Highcharts.Options>(() => {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#fff' : '#18181b';
    const slices = GOAL_MIX_KEYS.filter((key) => byType[key] > 0).map((key) => ({
      name: GOAL_ASSET_LABELS[key],
      y: Math.round(byType[key]),
      color: ASSET_COLORS[key],
    }));
    return {
      chart: { type: 'pie', height: 260, backgroundColor: 'transparent' },
      title: { text: undefined },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: isDark ? '#1f2937' : 'rgba(255, 255, 255, 0.95)',
        style: { color: textColor },
        pointFormatter(this: Highcharts.Point) {
          return `<b>${formatCurrency(this.y ?? 0)}</b> (${(this.percentage ?? 0).toFixed(1)}%)`;
        },
      },
      legend: {
        itemStyle: { color: isDark ? '#d1d5db' : '#6b7280', fontWeight: '500' },
      },
      plotOptions: {
        pie: {
          innerSize: '60%',
          borderWidth: 0,
          showInLegend: true,
          dataLabels: { enabled: false },
        },
      },
      series: [{ type: 'pie', name: 'Allocation', data: slices }],
    };
  }, [theme, byType]);

  const hasAnything = lines.length > 0 || manualAmount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>What funds this goal</CardTitle>
        <p className="text-sm text-muted-foreground">
          Each holding counts at the percentage you assigned to this goal.
        </p>
      </CardHeader>
      <CardContent>
        {!hasAnything ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No holdings linked yet. Edit the goal to link mutual funds, stocks, deposits or other
            savings.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <HighchartsReact highcharts={Highcharts} options={donutOptions} />

            <div className="min-w-0">
              <div className="space-y-3 md:hidden">
                {lines.map((line) => (
                  <MobileDataCard
                    key={`${line.allocation.assetType}:${line.allocation.assetKey}`}
                    title={<HoldingName line={line} />}
                    headline={formatCurrency(line.value)}
                    subline={
                      <span className="text-muted-foreground">
                        {formatPercentNumber(line.allocation.percent)}% allocated
                      </span>
                    }
                  >
                    <MobileDataMetric label="Type">
                      {GOAL_ASSET_LABELS[line.allocation.assetType]}
                    </MobileDataMetric>
                    <MobileDataMetric label="Invested">
                      {formatCurrency(line.invested)}
                    </MobileDataMetric>
                    <MobileDataMetric label="P/L">
                      <span className={getProfitLossColor(line.profitLoss)}>
                        {formatSignedCurrency(line.profitLoss)}
                      </span>
                    </MobileDataMetric>
                  </MobileDataCard>
                ))}
                {manualAmount > 0 && (
                  <MobileDataCard
                    title={GOAL_ASSET_LABELS.manual}
                    headline={formatCurrency(manualAmount)}
                    subline={<span className="text-muted-foreground">Entered manually</span>}
                    columns={2}
                  >
                    <MobileDataMetric label="Type">Cash / untracked</MobileDataMetric>
                    <MobileDataMetric label="Invested">
                      {formatCurrency(manualAmount)}
                    </MobileDataMetric>
                  </MobileDataCard>
                )}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Holding</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={`${line.allocation.assetType}:${line.allocation.assetKey}`}>
                      <TableCell className="max-w-[280px]">
                        <HoldingName line={line} />
                      </TableCell>
                      <TableCell>{GOAL_ASSET_LABELS[line.allocation.assetType]}</TableCell>
                      <TableCell className="text-right">
                        {formatPercentNumber(line.allocation.percent)}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(line.value)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(line.invested)}</TableCell>
                      <TableCell className={`text-right ${getProfitLossColor(line.profitLoss)}`}>
                        {formatSignedCurrency(line.profitLoss)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {manualAmount > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">{GOAL_ASSET_LABELS.manual}</TableCell>
                      <TableCell>Cash / untracked</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(manualAmount)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(manualAmount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">—</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
