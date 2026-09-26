import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCryptoTransactionsQuery } from '@myfinances/core/api/query/crypto';
import {
  useAddCryptoTransactionMutation,
  useUpdateCryptoTransactionMutation,
} from '@myfinances/core/api/mutations/crypto';
import {
  cryptoTransactionSchema,
  CryptoTransactionValues,
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

export default function CryptoTransactionForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const transactionsQuery = useCryptoTransactionsQuery();
  const existing = id ? transactionsQuery.data?.find((tx) => tx._id === id) : undefined;

  if (id && !existing) return <LoadingState />;

  return <CryptoForm id={id} initial={existing} />;
}

function CryptoForm({
  id,
  initial,
}: {
  id?: string;
  initial?: {
    type: 'credit' | 'debit';
    date: string;
    coinPrice: number;
    quantity: number;
    amount: number;
    coinName: string;
    coinSymbol: string;
  };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useAddCryptoTransactionMutation();
  const updateMutation = useUpdateCryptoTransactionMutation();
  const { control, handleSubmit } = useForm<CryptoTransactionValues>({
    resolver: zodResolver(cryptoTransactionSchema),
    defaultValues: initial
      ? { ...initial, date: new Date(initial.date) }
      : { type: 'credit', date: new Date(), coinName: '', coinSymbol: '' },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const payload = {
      ...values,
      coinSymbol: values.coinSymbol.trim().toUpperCase(),
      coinName: values.coinName.trim(),
      date: values.date.toISOString(),
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
      <Stack.Screen options={{ title: id ? 'Edit crypto' : 'Add crypto' }} />
      <FormScreen
        submitLabel={id ? 'Save changes' : 'Add transaction'}
        onSubmit={submit}
        submitting={addMutation.isPending || updateMutation.isPending}
        error={serverError}
      >
        <SegmentedField control={control} name="type" label="Type" options={BUY_SELL_OPTIONS} />
        <TextField control={control} name="coinName" label="Coin name" placeholder="e.g. Bitcoin" />
        <TextField
          control={control}
          name="coinSymbol"
          label="Symbol"
          placeholder="e.g. BTC"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <DateField control={control} name="date" label="Date" />
        <NumberField control={control} name="quantity" label="Quantity" />
        <NumberField control={control} name="coinPrice" label="Price per coin (₹)" />
        <NumberField control={control} name="amount" label="Total amount (₹)" />
      </FormScreen>
    </>
  );
}
