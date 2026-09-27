import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useExpenseTransactionsQuery } from '@myfinances/core/api/query/expenseTransactions';
import { useExpensesQuery } from '@myfinances/core/api/query/expenses';
import { useDeleteExpenseTransactionMutation } from '@myfinances/core/api/mutations/expenseTransactions';
import { TransactionRow } from '@/components/TransactionRow';
import { summariseSpend } from '@myfinances/core/calc/financialMonth';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { router } from 'expo-router';
import { AddButton, Card, EmptyState, Label, LoadingState, Row, Screen } from '@/components/ui';

const RECENT_COUNT = 30;

export default function ExpensesScreen() {
  const transactionsQuery = useExpenseTransactionsQuery();
  const recurringQuery = useExpensesQuery();
  const deleteMutation = useDeleteExpenseTransactionMutation();

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

      <Pressable
        onPress={() => router.push('/expenses/cash-flow')}
        className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-4"
      >
        <View className="gap-0.5">
          <Text className="text-base font-medium text-foreground">Cash flow</Text>
          <Text className="text-xs text-muted">Income, investments, expenses and savings rate</Text>
        </View>
        <Text className="text-sm text-muted">›</Text>
      </Pressable>

      <AddButton label="Log expense" onPress={() => router.push('/expenses/add')} />

      <Card>
        <Text className="text-base font-semibold text-foreground">Recent</Text>
        <Label>Tap to edit · long press to delete</Label>
        {transactions.length ? (
          transactions
            .slice(0, RECENT_COUNT)
            .map((tx) => (
              <TransactionRow
                key={tx._id}
                title={tx.name}
                subtitle={tx.category}
                date={tx.date}
                amount={tx.amount}
                isCredit
                onEdit={() => router.push({ pathname: '/expenses/add', params: { id: tx._id } })}
                onDelete={() => deleteMutation.mutateAsync(tx._id)}
              />
            ))
        ) : (
          <EmptyState message="No expenses logged yet." />
        )}
      </Card>

      <Card>
        <Text className="text-base font-semibold text-foreground">Recurring</Text>
        <AddButton
          label="Add recurring expense"
          onPress={() => router.push('/expenses/recurring')}
        />
        {(recurringQuery.data ?? []).length ? (
          recurringQuery.data!.map((expense) => (
            <Pressable
              key={expense._id}
              onPress={() =>
                router.push({ pathname: '/expenses/recurring', params: { id: expense._id } })
              }
            >
              <Row
                label={`${expense.expenseName} · ${expense.expenseFrequency}`}
                value={formatCurrency(expense.expenseAmount)}
              />
            </Pressable>
          ))
        ) : (
          <EmptyState message="No recurring expenses yet." />
        )}
      </Card>
    </Screen>
  );
}
