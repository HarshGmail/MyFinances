import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStockTransactionsQuery } from '@myfinances/core/api/query/stocks';
import {
  useAddStockTransactionMutation,
  useUpdateStockTransactionMutation,
} from '@myfinances/core/api/mutations/stocks';
import {
  stockTransactionSchema,
  StockTransactionValues,
} from '@myfinances/core/schemas/transactions';
import {
  BUY_SELL_OPTIONS,
  DateField,
  NumberField,
  SegmentedField,
  TextField,
} from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { LoadingState } from '@/components/ui';

export default function StockTransactionForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const transactionsQuery = useStockTransactionsQuery();
  const existing = id ? transactionsQuery.data?.find((tx) => tx.id === id) : undefined;

  if (id && !existing) return <LoadingState />;

  return <StockForm id={id} initial={existing} />;
}

function StockForm({
  id,
  initial,
}: {
  id?: string;
  initial?: {
    type: 'credit' | 'debit';
    date: string;
    marketPrice: number;
    numOfShares: number;
    stockName: string;
  };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useAddStockTransactionMutation();
  const updateMutation = useUpdateStockTransactionMutation();
  const { control, handleSubmit } = useForm<StockTransactionValues>({
    resolver: zodResolver(stockTransactionSchema),
    defaultValues: initial
      ? { ...initial, date: new Date(initial.date) }
      : { type: 'credit', date: new Date(), stockName: '' },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const payload = {
      ...values,
      stockName: values.stockName.trim().toUpperCase(),
      date: values.date.toISOString(),
      amount: values.marketPrice * values.numOfShares,
    };
    try {
      if (id) await updateMutation.mutateAsync({ id, ...payload });
      else await addMutation.mutateAsync(payload);
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit stock' : 'Add stock' }} />
      <FormScreen
        submitLabel={id ? 'Save changes' : 'Add transaction'}
        onSubmit={submit}
        submitting={addMutation.isPending || updateMutation.isPending}
        error={serverError}
      >
        <SegmentedField control={control} name="type" label="Type" options={BUY_SELL_OPTIONS} />
        <TextField
          control={control}
          name="stockName"
          label="NSE symbol"
          placeholder="e.g. INFY"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <DateField control={control} name="date" label="Date" />
        <NumberField control={control} name="numOfShares" label="Shares" />
        <NumberField control={control} name="marketPrice" label="Price per share (₹)" />
      </FormScreen>
    </>
  );
}
