import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useStockTransactionsQuery } from '@myfinances/core/api/query/stocks';
import { useCryptoTransactionsQuery } from '@myfinances/core/api/query/crypto';
import { useGoldTransactionsQuery } from '@myfinances/core/api/query/gold';
import { useMutualFundTransactionsQuery } from '@myfinances/core/api/query/mutual-funds';
import { useDeleteStockTransactionMutation } from '@myfinances/core/api/mutations/stocks';
import { useDeleteCryptoTransactionMutation } from '@myfinances/core/api/mutations/crypto';
import { useDeleteGoldTransactionMutation } from '@myfinances/core/api/mutations/gold';
import { useDeleteMutualFundTransactionMutation } from '@myfinances/core/api/mutations/mutual-funds';
import { GOLD_CATEGORY_LABELS, getGoldCategory } from '@myfinances/core/calc/goldCategories';
import { AddButton, Card, EmptyState, LoadingState, Screen } from '@/components/ui';
import { TransactionRow } from '@/components/TransactionRow';

type Kind = 'stocks' | 'mutualFunds' | 'gold' | 'crypto';

const KINDS: { value: Kind; label: string; addHref: Href }[] = [
  { value: 'stocks', label: 'Stocks', addHref: '/assets/forms/stock' },
  { value: 'mutualFunds', label: 'MF', addHref: '/assets/forms/mutual-fund' },
  { value: 'gold', label: 'Gold', addHref: '/assets/forms/gold' },
  { value: 'crypto', label: 'Crypto', addHref: '/assets/forms/crypto' },
];

interface Row {
  key: string;
  title: string;
  subtitle?: string;
  date: string;
  amount: number;
  isCredit: boolean;
  editHref?: Href;
  remove: () => Promise<unknown>;
}

function byNewest(a: Row, b: Row) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

export default function TransactionsScreen() {
  const [kind, setKind] = useState<Kind>('stocks');
  const stocks = useStockTransactionsQuery();
  const funds = useMutualFundTransactionsQuery();
  const gold = useGoldTransactionsQuery();
  const crypto = useCryptoTransactionsQuery();
  const deleteStock = useDeleteStockTransactionMutation();
  const deleteFund = useDeleteMutualFundTransactionMutation();
  const deleteGold = useDeleteGoldTransactionMutation();
  const deleteCrypto = useDeleteCryptoTransactionMutation();

  const queries = { stocks, mutualFunds: funds, gold, crypto };
  const active = queries[kind];

  const rows = useMemo<Row[]>(() => {
    switch (kind) {
      case 'stocks':
        return (stocks.data ?? []).map((tx) => ({
          key: tx.id,
          title: tx.stockName,
          subtitle: `${tx.numOfShares} @ ₹${tx.marketPrice}`,
          date: tx.date,
          amount: tx.amount,
          isCredit: tx.type === 'credit',
          editHref: { pathname: '/assets/forms/stock', params: { id: tx.id } },
          remove: () => deleteStock.mutateAsync(tx.id),
        }));
      case 'mutualFunds':
        return (funds.data ?? []).map((tx) => ({
          key: tx.id,
          title: tx.fundName,
          subtitle: `${tx.numOfUnits.toFixed(3)} units`,
          date: tx.date,
          amount: tx.amount,
          isCredit: tx.type === 'credit',
          remove: () => deleteFund.mutateAsync(tx.id),
        }));
      case 'gold':
        return (gold.data ?? []).map((tx) => ({
          key: tx.id,
          title: `${tx.quantity.toFixed(4)} g`,
          subtitle: GOLD_CATEGORY_LABELS[getGoldCategory(tx)],
          date: tx.date,
          amount: tx.amount,
          isCredit: tx.type === 'credit',
          editHref: { pathname: '/assets/forms/gold', params: { id: tx.id } },
          remove: () => deleteGold.mutateAsync(tx.id),
        }));
      case 'crypto':
        return (crypto.data ?? []).map((tx) => ({
          key: tx._id,
          title: `${tx.coinName} (${tx.coinSymbol})`,
          subtitle: `${tx.quantity}`,
          date: tx.date,
          amount: tx.amount,
          isCredit: tx.type === 'credit',
          editHref: { pathname: '/assets/forms/crypto', params: { id: tx._id } },
          remove: () => deleteCrypto.mutateAsync(tx._id),
        }));
    }
  }, [
    kind,
    stocks.data,
    funds.data,
    gold.data,
    crypto.data,
    deleteStock,
    deleteFund,
    deleteGold,
    deleteCrypto,
  ]);

  const sorted = useMemo(() => [...rows].sort(byNewest), [rows]);
  const addHref = KINDS.find((option) => option.value === kind)!.addHref;

  return (
    <Screen underHeader refreshing={active.isFetching} onRefresh={active.refetch}>
      <View className="flex-row gap-2">
        {KINDS.map((option) => {
          const selected = option.value === kind;
          return (
            <Pressable
              key={option.value}
              onPress={() => setKind(option.value)}
              className={`h-9 flex-1 items-center justify-center rounded-full border ${selected ? 'border-foreground bg-foreground' : 'border-border'}`}
            >
              <Text
                className={
                  selected ? 'text-sm font-semibold text-background' : 'text-sm text-foreground'
                }
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AddButton label="Add transaction" onPress={() => router.push(addHref)} />

      {active.isLoading ? (
        <LoadingState />
      ) : (
        <Card>
          <Text className="text-xs text-muted">Tap to edit · long press to delete</Text>
          {sorted.length ? (
            sorted.map((row) => (
              <TransactionRow
                key={row.key}
                title={row.title}
                subtitle={row.subtitle}
                date={row.date}
                amount={row.amount}
                isCredit={row.isCredit}
                onEdit={row.editHref ? () => router.push(row.editHref!) : undefined}
                onDelete={row.remove}
              />
            ))
          ) : (
            <EmptyState message="No transactions yet." />
          )}
        </Card>
      )}
    </Screen>
  );
}
