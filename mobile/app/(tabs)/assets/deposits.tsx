import { Text, View } from 'react-native';
import { useFixedDepositsQuery } from '@myfinances/core/api/query/fixed-deposits';
import { useRecurringDepositsQuery } from '@myfinances/core/api/query/recurring-deposits';
import {
  fixedDepositProgress,
  recurringDepositProgress,
  summariseFixedDeposits,
  summariseRecurringDeposits,
} from '@myfinances/core/calc/deposits';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { router } from 'expo-router';
import { AddButton, Card, EmptyState, LoadingState, Row, Screen } from '@/components/ui';
import { SummaryCard } from '@/components/HoldingCard';

const FULL_PROGRESS = 100;

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.min((completed / total) * FULL_PROGRESS, FULL_PROGRESS) : 0;
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-accent">
      <View className="h-full rounded-full bg-gain" style={{ width: `${percent}%` }} />
    </View>
  );
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DepositsScreen() {
  const fdQuery = useFixedDepositsQuery();
  const rdQuery = useRecurringDepositsQuery();

  if (fdQuery.isLoading || rdQuery.isLoading) return <LoadingState />;

  const fds = fdQuery.data ?? [];
  const rds = rdQuery.data ?? [];
  const fdSummary = summariseFixedDeposits(fds);
  const rdSummary = summariseRecurringDeposits(rds);

  return (
    <Screen
      underHeader
      refreshing={fdQuery.isFetching || rdQuery.isFetching}
      onRefresh={() => {
        fdQuery.refetch();
        rdQuery.refetch();
      }}
    >
      {!fds.length && !rds.length && <EmptyState message="No fixed or recurring deposits yet." />}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <AddButton label="FD" onPress={() => router.push('/assets/forms/fixed-deposit')} />
        </View>
        <View className="flex-1">
          <AddButton label="RD" onPress={() => router.push('/assets/forms/recurring-deposit')} />
        </View>
      </View>

      {fds.length > 0 && (
        <>
          <SummaryCard
            label="Fixed deposits"
            value={fdSummary.currentValue}
            profitLoss={fdSummary.profitLoss}
            profitLossPercentage={fdSummary.profitLossPercentage}
          >
            <Row label="Invested" value={formatCurrency(fdSummary.invested)} />
          </SummaryCard>
          {fds.map((fd) => {
            const progress = fixedDepositProgress(fd);
            return (
              <Card key={fd._id}>
                <Text className="text-sm font-semibold text-foreground">{fd.fixedDepositName}</Text>
                <Row label="Principal" value={formatCurrency(fd.amountInvested)} />
                <Row label="Rate" value={`${fd.rateOfInterest}%`} />
                <Row label="Value today" value={formatCurrency(progress.currentValue)} />
                <Row label="Matures" value={formatDate(fd.dateOfMaturity)} />
                <ProgressBar completed={progress.daysCompleted} total={progress.totalDays} />
              </Card>
            );
          })}
        </>
      )}

      {rds.length > 0 && (
        <>
          <SummaryCard
            label="Recurring deposits"
            value={rdSummary.currentValue}
            profitLoss={rdSummary.profitLoss}
            profitLossPercentage={rdSummary.profitLossPercentage}
          >
            <Row label="Invested" value={formatCurrency(rdSummary.invested)} />
          </SummaryCard>
          {rds.map((rd) => {
            const progress = recurringDepositProgress(rd);
            return (
              <Card key={rd._id}>
                <Text className="text-sm font-semibold text-foreground">
                  {rd.recurringDepositName}
                </Text>
                <Row label="Monthly" value={formatCurrency(rd.monthlyDeposit)} />
                <Row label="Rate" value={`${rd.rateOfInterest}%`} />
                <Row label="Value today" value={formatCurrency(progress.currentValue)} />
                <Row label="Matures" value={formatDate(rd.dateOfMaturity)} />
                <ProgressBar completed={progress.monthsCompleted} total={progress.totalMonths} />
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
