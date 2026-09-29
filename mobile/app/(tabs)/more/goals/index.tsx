import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useGoalsData } from '@myfinances/core/hooks/useGoalsData';
import type { GoalView } from '@myfinances/core/calc/goals';
import { AddButton, Button, Card, Label, LoadingState, Row, Screen } from '@/components/ui';
import { SummaryCard } from '@/components/HoldingCard';
import {
  GoalProgressBar,
  StatusPill,
  formatRupees,
  timeLeftLabel,
} from '@/features/goals/goalDisplay';
import { useRefreshing } from '@/features/goals/useRefreshing';

const PERCENT = 100;

function openEditor() {
  router.push('/more/goals/edit');
}

function GoalCard({ view }: { view: GoalView }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/more/goals/[id]', params: { id: view.goal._id } })}
      accessibilityRole="button"
    >
      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-base font-semibold text-foreground" numberOfLines={2}>
            {view.goal.goalName}
          </Text>
          <StatusPill status={view.status} />
        </View>
        <GoalProgressBar percentage={view.progressPct} />
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-foreground">
            {`${formatRupees(view.value.currentValue)} of ${formatRupees(view.targetAmount)}`}
          </Text>
          <Text className="text-sm font-semibold text-foreground">
            {`${Math.round(view.progressPct)}%`}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Label>{timeLeftLabel(view.goal.targetDate, view.monthsLeft)}</Label>
          <Label>
            {`Needs ${formatRupees(view.requiredMonthly)}/mo · Investing ${formatRupees(view.currentMonthly)}/mo`}
          </Label>
        </View>
      </Card>
    </Pressable>
  );
}

function GoalsEmptyState() {
  return (
    <Card>
      <Text className="text-base font-semibold text-foreground">Plan for what matters</Text>
      <Text className="text-sm text-muted">
        Set a target amount and date, then fund it with a share of your mutual funds, stocks,
        crypto, gold, EPF or deposits. We track what you have saved, project where you will land and
        tell you how much to invest each month.
      </Text>
      <Button label="Create your first goal" onPress={openEditor} />
    </Card>
  );
}

export default function GoalsScreen() {
  const { views, summary, isLoading, isHoldingsLoading, refetch } = useGoalsData();
  const { refreshing, onRefresh } = useRefreshing(refetch);

  const sortedViews = useMemo(
    () =>
      [...views].sort(
        (a, b) => new Date(a.goal.targetDate).getTime() - new Date(b.goal.targetDate).getTime()
      ),
    [views]
  );
  const totals = useMemo(() => {
    const invested = views.reduce((sum, view) => sum + view.value.invested, 0);
    const profitLoss = views.reduce((sum, view) => sum + view.value.profitLoss, 0);
    return { profitLoss, profitLossPct: invested > 0 ? (profitLoss / invested) * PERCENT : 0 };
  }, [views]);

  if (isLoading || (views.length > 0 && isHoldingsLoading)) return <LoadingState />;

  return (
    <Screen underHeader refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: 'Goals' }} />
      {sortedViews.length ? (
        <>
          <SummaryCard
            label="Saved towards goals"
            value={summary.totalSaved}
            profitLoss={totals.profitLoss}
            profitLossPercentage={totals.profitLossPct}
          >
            <Row label="Total target" value={formatRupees(summary.totalTarget)} />
            <Row label="On track" value={`${summary.onTrackCount} of ${views.length}`} />
            <Row
              label="Monthly needed vs investing"
              value={`${formatRupees(summary.totalRequiredMonthly)} / ${formatRupees(summary.totalCurrentMonthly)}`}
            />
          </SummaryCard>
          <AddButton label="Add goal" onPress={openEditor} />
          {sortedViews.map((view) => (
            <GoalCard key={view.goal._id} view={view} />
          ))}
        </>
      ) : (
        <GoalsEmptyState />
      )}
    </Screen>
  );
}
