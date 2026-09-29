import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useUserGoalsQuery } from '@myfinances/core/api/query/userGoals';
import { useGoalHoldingValues } from '@myfinances/core/hooks/useGoalHoldingValues';
import { computeGoalProgress } from '@myfinances/core/calc/goals';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { AddButton, Card, EmptyState, Label, LoadingState, Row, Screen } from '@/components/ui';

const FULL_PROGRESS = 100;

function ProgressBar({ percentage }: { percentage: number }) {
  const width = `${Math.min(percentage, FULL_PROGRESS)}%` as const;
  const fillClass = percentage >= FULL_PROGRESS ? 'bg-gain' : 'bg-foreground';
  return (
    <View className="h-2 overflow-hidden rounded-full bg-accent">
      <View className={`h-full rounded-full ${fillClass}`} style={{ width }} />
    </View>
  );
}

export default function GoalsScreen() {
  const goalsQuery = useUserGoalsQuery();
  const { values, mfInfo, isLoading } = useGoalHoldingValues();

  const goals = useMemo(
    () =>
      (goalsQuery.data ?? [])
        .map((goal) => computeGoalProgress(goal, values, mfInfo))
        .sort((a, b) => b.progressPercentage - a.progressPercentage),
    [goalsQuery.data, values, mfInfo]
  );

  if (goalsQuery.isLoading || isLoading) return <LoadingState />;

  return (
    <Screen underHeader refreshing={goalsQuery.isFetching} onRefresh={goalsQuery.refetch}>
      <Stack.Screen options={{ title: 'Goals' }} />
      <AddButton label="Add goal" onPress={() => router.push('/more/goals/edit')} />
      {goals.length ? (
        goals.map((progress) => (
          <Pressable
            key={progress.goal._id}
            onPress={() =>
              router.push({ pathname: '/more/goals/edit', params: { id: progress.goal._id } })
            }
          >
            <Card>
              <View className="flex-row items-start justify-between gap-3">
                <Text className="flex-1 text-base font-semibold text-foreground">
                  {progress.goal.goalName}
                </Text>
                <Text className="text-sm font-semibold text-foreground">
                  {progress.progressPercentage.toFixed(0)}%
                </Text>
              </View>
              {progress.goal.description ? <Label>{progress.goal.description}</Label> : null}
              <ProgressBar percentage={progress.progressPercentage} />
              <Row
                label="Saved"
                value={`${formatCurrency(progress.currentValue)} of ${formatCurrency(progress.targetAmount)}`}
              />
              <Row label="Remaining" value={formatCurrency(progress.remainingAmount)} />
              <Text className="text-xs text-muted">
                {[
                  progress.breakdown.stocks > 0 &&
                    `Stocks ${formatCurrency(progress.breakdown.stocks)}`,
                  progress.breakdown.mutualFunds > 0 &&
                    `Funds ${formatCurrency(progress.breakdown.mutualFunds)}`,
                  progress.breakdown.crypto > 0 &&
                    `Crypto ${formatCurrency(progress.breakdown.crypto)}`,
                  progress.breakdown.gold > 0 && `Gold ${formatCurrency(progress.breakdown.gold)}`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No holdings linked yet'}
              </Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <EmptyState message="No goals yet. Link holdings to a target to track progress." />
      )}
    </Screen>
  );
}
