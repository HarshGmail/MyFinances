import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useUserProfileQuery } from '@myfinances/core/api/query/profile';
import {
  useExpensesQuery,
  useMonthlyInvestmentSummaryQuery,
} from '@myfinances/core/api/query/expenses';
import { buildMonthlyCashFlow, summariseCashFlow } from '@myfinances/core/calc/cashFlow';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { Card, EmptyState, Label, LoadingState, Row, Screen } from '@/components/ui';
import { LineChart } from '@/components/LineChart';
import { colors } from '@/lib/theme';

const SAVINGS_TARGET_PCT = 70;
const INCOME_COLOR = '#10b981';
const INVESTMENT_COLOR = '#3b82f6';
const EXPENSE_COLOR = '#f97316';
const THOUSAND = 1000;

function compactRupees(value: number) {
  return `₹${Math.round(value / THOUSAND)}k`;
}

function monthLabel(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export default function CashFlowScreen() {
  const profileQuery = useUserProfileQuery();
  const expensesQuery = useExpensesQuery();
  const summaryQuery = useMonthlyInvestmentSummaryQuery();

  const months = useMemo(
    () =>
      profileQuery.data
        ? buildMonthlyCashFlow(profileQuery.data, expensesQuery.data, summaryQuery.data)
        : [],
    [profileQuery.data, expensesQuery.data, summaryQuery.data]
  );
  const stats = useMemo(() => summariseCashFlow(months), [months]);
  const chronological = useMemo(() => [...months].reverse(), [months]);

  if (profileQuery.isLoading || summaryQuery.isLoading) return <LoadingState />;
  const current = months[0];

  return (
    <Screen
      underHeader
      refreshing={summaryQuery.isFetching}
      onRefresh={() => {
        profileQuery.refetch();
        expensesQuery.refetch();
        summaryQuery.refetch();
      }}
    >
      <Stack.Screen options={{ title: 'Cash flow' }} />
      {!current ? (
        <EmptyState message="Add your salary under More → Salary to see cash flow." />
      ) : (
        <>
          <Card>
            <Label>This month · {current.monthStr}</Label>
            <Row label="Income" value={formatCurrency(current.actualPaid)} />
            <Row label="Invested" value={formatCurrency(current.totalInvestments)} />
            <Row label="Fixed expenses" value={formatCurrency(current.fixedExpenses)} />
            <Row label="Variable expenses" value={formatCurrency(current.variableExpenses)} />
            <Row label="Left to spend" value={formatCurrency(current.discretionarySpending)} />
            <View className="flex-row items-baseline justify-between pt-1">
              <Text className="text-sm text-muted">Savings rate</Text>
              <Text
                className={`text-xl font-bold ${current.savingsRate >= SAVINGS_TARGET_PCT ? 'text-gain' : 'text-foreground'}`}
              >
                {current.savingsRate.toFixed(0)}%
              </Text>
            </View>
            <Label>Target {SAVINGS_TARGET_PCT}% of take-home invested.</Label>
          </Card>

          <Card>
            <Text className="text-base font-semibold text-foreground">Last 12 months</Text>
            <LineChart
              series={[
                {
                  label: 'Income',
                  color: INCOME_COLOR,
                  points: chronological.map((m) => ({ x: m.month.getTime(), y: m.actualPaid })),
                },
                {
                  label: 'Invested',
                  color: INVESTMENT_COLOR,
                  points: chronological.map((m) => ({
                    x: m.month.getTime(),
                    y: m.totalInvestments,
                  })),
                },
                {
                  label: 'Expenses',
                  color: EXPENSE_COLOR,
                  points: chronological.map((m) => ({ x: m.month.getTime(), y: m.totalExpenses })),
                },
              ]}
              formatY={compactRupees}
              formatX={monthLabel}
            />
          </Card>

          <Card>
            <Text className="text-base font-semibold text-foreground">Savings rate</Text>
            <LineChart
              height={140}
              series={[
                {
                  label: 'Savings rate',
                  color: colors.foreground,
                  points: chronological.map((m) => ({ x: m.month.getTime(), y: m.savingsRate })),
                },
                {
                  label: 'Target',
                  color: colors.gain,
                  dashed: true,
                  points: chronological.map((m) => ({
                    x: m.month.getTime(),
                    y: SAVINGS_TARGET_PCT,
                  })),
                },
              ]}
              formatY={(value) => `${value.toFixed(0)}%`}
              formatX={monthLabel}
            />
          </Card>

          <Card>
            <Text className="text-base font-semibold text-foreground">12-month averages</Text>
            <Row label="Income" value={formatCurrency(stats.avgMonthlyIncome)} />
            <Row label="Invested" value={formatCurrency(stats.avgMonthlyInvestments)} />
            <Row label="Expenses" value={formatCurrency(stats.avgMonthlyExpenses)} />
            <Row label="Savings rate" value={`${stats.avgSavingsRate.toFixed(0)}%`} />
            <Label>
              Recurring expenses are applied to every month, including months before you added them.
            </Label>
          </Card>
        </>
      )}
    </Screen>
  );
}
