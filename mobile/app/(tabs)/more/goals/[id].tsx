import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useGoalsData } from '@myfinances/core/hooks/useGoalsData';
import {
  GOAL_ASSET_LABELS,
  GOAL_ASSET_TYPES,
  GoalLine,
  GoalView,
  ReturnBasis,
  ValuePoint,
} from '@myfinances/core/calc/goals';
import type { GoalAssetType } from '@myfinances/core/types';
import { Button, Card, EmptyState, Label, LoadingState, Row, Screen } from '@/components/ui';
import { SignedText } from '@/components/HoldingCard';
import { LineChart } from '@/components/LineChart';
import { changeClass, colors } from '@/lib/theme';
import {
  ASSET_TYPE_COLORS,
  GoalProgressBar,
  StatusPill,
  allocationLabel,
  compactRupees,
  formatFullDate,
  formatMonthYear,
  formatPercent,
  formatRupees,
  formatSignedRupees,
  timeLeftLabel,
} from '@/features/goals/goalDisplay';
import { useRefreshing } from '@/features/goals/useRefreshing';

const PERCENT = 100;
const CHART_HEIGHT = 200;
const INVESTED_COLOR = colors.foreground;
const PROJECTION_COLOR = colors.gain;
const REQUIRED_COLOR = '#f97316';

const BASIS_LABELS: Record<ReturnBasis, string> = {
  override: 'set by you',
  rate: 'interest rate',
  history: 'own history (XIRR)',
  default: 'long-run default',
};

type BreakdownType = GoalAssetType | 'manual';

function toChartPoints(points: ValuePoint[]) {
  return points.map((point) => ({ x: point.date.getTime(), y: point.value }));
}

function investedUpToNow(view: GoalView) {
  const points = toChartPoints(view.investedSeries);
  const last = points.at(-1);
  const now = view.projection[0]?.date.getTime() ?? Date.now();
  return last && last.x < now ? [...points, { x: now, y: last.y }] : points;
}

function percentOf(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * PERCENT : 0;
}

function GoalChart({ view }: { view: GoalView }) {
  const series = useMemo(
    () =>
      [
        {
          label: 'Projected',
          color: PROJECTION_COLOR,
          dashed: true,
          points: toChartPoints(view.projection),
        },
        {
          label: 'Required',
          color: REQUIRED_COLOR,
          dashed: true,
          points: toChartPoints(view.requiredPath),
        },
        { label: 'Invested', color: INVESTED_COLOR, points: investedUpToNow(view) },
      ].filter((line) => line.points.length > 0),
    [view]
  );

  return (
    <Card>
      <Text className="text-base font-semibold text-foreground">Path to target</Text>
      <LineChart
        height={CHART_HEIGHT}
        series={series}
        formatY={compactRupees}
        formatX={formatMonthYear}
      />
      <Label>
        Invested is money put in so far. Projected grows today&apos;s value at the expected return
        with your monthly investment. Required is the path that lands exactly on target.
      </Label>
    </Card>
  );
}

function BreakdownCard({ view }: { view: GoalView }) {
  const total = view.value.currentValue;
  const entries = ([...GOAL_ASSET_TYPES, 'manual'] as BreakdownType[])
    .map((type) => ({ type, value: view.value.byType[type] }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!entries.length) return null;

  return (
    <Card>
      <Text className="text-base font-semibold text-foreground">By asset type</Text>
      <View className="h-2 flex-row gap-0.5 overflow-hidden rounded-full">
        {entries.map((entry) => (
          <View
            key={entry.type}
            style={{ flex: entry.value, backgroundColor: ASSET_TYPE_COLORS[entry.type] }}
          />
        ))}
      </View>
      {entries.map((entry) => (
        <View key={entry.type} className="flex-row items-center justify-between py-1">
          <View className="flex-row items-center gap-2">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: ASSET_TYPE_COLORS[entry.type] }}
            />
            <Text className="text-sm text-muted">{GOAL_ASSET_LABELS[entry.type]}</Text>
          </View>
          <Text className="text-sm font-medium text-foreground">
            {`${formatRupees(entry.value)} · ${Math.round(percentOf(entry.value, total))}%`}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function HoldingLineRow({ line }: { line: GoalLine }) {
  const label = allocationLabel(line.allocation, line.holding);
  return (
    <View className="flex-row items-start justify-between gap-3 border-t border-border py-2">
      <View className="flex-1 gap-0.5">
        <Text className="text-sm text-foreground" numberOfLines={2}>
          {label}
        </Text>
        <Text className="text-xs text-muted">
          {`${GOAL_ASSET_LABELS[line.allocation.assetType]} · ${formatPercent(line.allocation.percent)} allocated`}
        </Text>
      </View>
      {line.holding ? (
        <View className="items-end gap-0.5">
          <Text className="text-sm font-medium text-foreground">{formatRupees(line.value)}</Text>
          <SignedText value={line.profitLoss}>
            {`${formatSignedRupees(line.profitLoss)} (${percentOf(line.profitLoss, line.invested).toFixed(1)}%)`}
          </SignedText>
        </View>
      ) : (
        <Text className="text-xs text-loss">Not found</Text>
      )}
    </View>
  );
}

function HoldingsCard({ view }: { view: GoalView }) {
  const manualAmount = view.goal.manualAmount ?? 0;
  const lines = [...view.value.lines].sort((a, b) => b.value - a.value);

  return (
    <Card>
      <Text className="text-base font-semibold text-foreground">Holdings</Text>
      {lines.length === 0 && manualAmount <= 0 ? (
        <Label>No holdings linked yet. Edit the goal to fund it.</Label>
      ) : null}
      {lines.map((line) => (
        <HoldingLineRow
          key={`${line.allocation.assetType}:${line.allocation.assetKey}`}
          line={line}
        />
      ))}
      {manualAmount > 0 && (
        <View className="flex-row items-center justify-between border-t border-border py-2">
          <View className="flex-1 gap-0.5">
            <Text className="text-sm text-foreground">{GOAL_ASSET_LABELS.manual}</Text>
            <Text className="text-xs text-muted">Entered manually · no growth assumed</Text>
          </View>
          <Text className="text-sm font-medium text-foreground">{formatRupees(manualAmount)}</Text>
        </View>
      )}
    </Card>
  );
}

function AssumptionsCard({ view, inflationPct }: { view: GoalView; inflationPct: number }) {
  const { expectedReturn, goal } = view;
  const returnNote =
    expectedReturn.basis === 'override'
      ? `You set ${expectedReturn.pct.toFixed(1)}% a year. The blended default from your holdings would be ${expectedReturn.blendedPct.toFixed(1)}%.`
      : `${expectedReturn.pct.toFixed(1)}% a year, weighted by each holding's value in this goal.`;
  const inflationNote = goal.inflationAdjusted
    ? `${formatRupees(view.targetInTodaysMoney)} in today's money grows to ${formatRupees(view.targetAmount)} by ${formatMonthYear(goal.targetDate)} at ${inflationPct.toFixed(1)}% inflation.`
    : `The target is not adjusted for inflation. At ${inflationPct.toFixed(1)}% a year, prices will be higher by the target date.`;
  const monthlyNote =
    view.monthlyBasis === 'planned'
      ? `Uses your planned ${formatRupees(view.currentMonthly)} a month.`
      : 'Uses your average net investment into these holdings over the last 12 months, scaled by the share allocated.';

  return (
    <Card>
      <Text className="text-base font-semibold text-foreground">Assumptions</Text>
      <Label>Expected return</Label>
      <Text className="text-sm text-foreground">{returnNote}</Text>
      {expectedReturn.sources.map((source) => (
        <View
          key={`${source.assetType}:${source.label}`}
          className="flex-row items-start justify-between gap-3"
        >
          <Text className="flex-1 text-xs text-muted" numberOfLines={2}>
            {`${source.label} · ${BASIS_LABELS[source.basis]}`}
          </Text>
          <Text className="text-xs text-foreground">
            {`${source.pct.toFixed(1)}% × ${Math.round(source.weight * PERCENT)}%`}
          </Text>
        </View>
      ))}
      <Label>Inflation</Label>
      <Text className="text-sm text-foreground">{inflationNote}</Text>
      <Label>Monthly investment</Label>
      <Text className="text-sm text-foreground">{monthlyNote}</Text>
    </Card>
  );
}

function GoalDetail({ view, inflationPct }: { view: GoalView; inflationPct: number }) {
  const { goal, value } = view;
  const profitLossPct = percentOf(value.profitLoss, value.invested);
  const monthlyGap = view.currentMonthly - view.requiredMonthly;

  return (
    <>
      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-xl font-bold text-foreground">{goal.goalName}</Text>
          <StatusPill status={view.status} />
        </View>
        {goal.description ? <Label>{goal.description}</Label> : null}
        <Text className="text-3xl font-bold text-foreground">
          {formatRupees(value.currentValue)}
        </Text>
        <GoalProgressBar percentage={view.progressPct} />
        <View className="flex-row items-center justify-between">
          <Label>{`${Math.round(view.progressPct)}% of ${formatRupees(view.targetAmount)}`}</Label>
          <Label>{timeLeftLabel(goal.targetDate, view.monthsLeft)}</Label>
        </View>
      </Card>

      <Card>
        <Row label="Current value" value={formatRupees(value.currentValue)} />
        <Row label="Invested" value={formatRupees(value.invested)} />
        <Row
          label="Profit / loss"
          value={
            <Text className={`text-sm font-medium ${changeClass(value.profitLoss)}`}>
              {`${formatSignedRupees(value.profitLoss)} (${profitLossPct.toFixed(1)}%)`}
            </Text>
          }
        />
        <Row label="Target" value={formatRupees(view.targetAmount)} />
        {goal.inflationAdjusted ? (
          <Row label="In today's money" value={formatRupees(view.targetInTodaysMoney)} />
        ) : null}
        <Row label="Target date" value={formatFullDate(goal.targetDate)} />
        <Row label="Remaining" value={formatRupees(view.remaining)} />
        <Row
          label="Projected at target date"
          value={
            <Text
              className={`text-sm font-medium ${changeClass(view.projectedValue - view.targetAmount)}`}
            >
              {formatRupees(view.projectedValue)}
            </Text>
          }
        />
        <Row label="Required monthly" value={formatRupees(view.requiredMonthly)} />
        <Row
          label={view.monthlyBasis === 'planned' ? 'Planned monthly' : 'Investing monthly'}
          value={
            <Text className={`text-sm font-medium ${changeClass(monthlyGap)}`}>
              {formatRupees(view.currentMonthly)}
            </Text>
          }
        />
        <Row
          label="Expected return"
          value={`${view.expectedReturn.pct.toFixed(1)}% p.a. (${BASIS_LABELS[view.expectedReturn.basis]})`}
        />
      </Card>

      <GoalChart view={view} />
      <BreakdownCard view={view} />
      <HoldingsCard view={view} />
      <AssumptionsCard view={view} inflationPct={inflationPct} />

      <Button
        label="Edit goal"
        variant="secondary"
        onPress={() => router.push({ pathname: '/more/goals/edit', params: { id: goal._id } })}
      />
    </>
  );
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { views, inflationPct, isLoading, isHoldingsLoading, refetch } = useGoalsData();
  const { refreshing, onRefresh } = useRefreshing(refetch);
  const view = views.find((candidate) => candidate.goal._id === id);

  if (isLoading || isHoldingsLoading) return <LoadingState />;

  return (
    <Screen underHeader refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: view?.goal.goalName ?? 'Goal' }} />
      {view ? (
        <GoalDetail view={view} inflationPct={inflationPct} />
      ) : (
        <EmptyState message="This goal no longer exists." />
      )}
    </Screen>
  );
}
