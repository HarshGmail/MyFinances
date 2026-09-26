import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useExpenseTransactionsQuery } from '@myfinances/core/api/query/expenseTransactions';
import { useExpensesQuery } from '@myfinances/core/api/query/expenses';
import { summariseSpend } from '@myfinances/core/calc/financialMonth';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { Card, EmptyState, Label, LoadingState, Row, Screen } from '@/components/ui';

const RECENT_COUNT = 30;

function formatDay(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ExpensesScreen() {
  const transactionsQuery = useExpenseTransactionsQuery();
  const recurringQuery = useExpensesQuery();

  const transactions = useMemo(
    () =>
      [...(transactionsQuery.data ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [transactionsQuery.data]
  );
  const totals = useMemo(() => summariseSpend(transactions), [transactions]);

  if (transactionsQuery.isLoading) return <LoadingState />;

  return (
    <Screen
      title="Expenses"
      refreshing={transactionsQuery.isFetching || recurringQuery.isFetching}
      onRefresh={() => {
        transactionsQuery.refetch();
        recurringQuery.refetch();
      }}
    >
      <View className="flex-row gap-3">
        {(
          [
            ['Today', totals.today],
            ['This week', totals.thisWeek],
            ['This month', totals.thisMonth],
          ] as const
        ).map(([label, amount]) => (
          <Card key={label} className="flex-1">
            <Label>{label}</Label>
            <Text className="text-base font-bold text-foreground">{formatCurrency(amount)}</Text>
          </Card>
        ))}
      </View>

      <Card>
        <Text className="text-base font-semibold text-foreground">Recent</Text>
        {transactions.length ? (
          transactions.slice(0, RECENT_COUNT).map((tx) => (
            <View key={tx._id} className="flex-row justify-between border-t border-border py-2">
              <View className="flex-1 pr-3">
                <Text className="text-sm text-foreground" numberOfLines={1}>
                  {tx.name}
                </Text>
                <Label>
                  {tx.category} · {formatDay(tx.date)}
                </Label>
              </View>
              <Text className="text-sm font-medium text-foreground">
                {formatCurrency(tx.amount)}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState message="No expenses logged yet." />
        )}
      </Card>

      {(recurringQuery.data ?? []).length > 0 && (
        <Card>
          <Text className="text-base font-semibold text-foreground">Recurring</Text>
          {recurringQuery.data!.map((expense) => (
            <Row
              key={expense._id}
              label={`${expense.expenseName} · ${expense.expenseFrequency}`}
              value={formatCurrency(expense.expenseAmount)}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
