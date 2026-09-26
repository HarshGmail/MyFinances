import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGoldTransactionsQuery } from '@myfinances/core/api/query/gold';
import {
  useAddGoldTransactionMutation,
  useUpdateGoldTransactionMutation,
} from '@myfinances/core/api/mutations/gold';
import {
  goldTransactionSchema,
  GoldTransactionValues,
  goldTransactionPayload,
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

export default function GoldTransactionForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const transactionsQuery = useGoldTransactionsQuery();
  const existing = id ? transactionsQuery.data?.find((tx) => tx.id === id) : undefined;

  if (id && !existing) return <LoadingState />;

  return <GoldForm id={id} initial={existing} />;
}

function GoldForm({
  id,
  initial,
}: {
  id?: string;
  initial?: {
    type: 'credit' | 'debit';
    date: string;
    quantity: number;
    amount: number;
    platform?: string;
  };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useAddGoldTransactionMutation();
  const updateMutation = useUpdateGoldTransactionMutation();
  const { control, handleSubmit } = useForm<GoldTransactionValues>({
    resolver: zodResolver(goldTransactionSchema),
    defaultValues: initial
      ? {
          type: initial.type,
          date: new Date(initial.date),
          quantity: initial.quantity,
          amount: initial.amount,
          platform: initial.platform,
        }
      : { type: 'credit', date: new Date(), platform: 'SafeGold' },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const payload = goldTransactionPayload(values);
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
      <Stack.Screen options={{ title: id ? 'Edit gold' : 'Add gold' }} />
      <FormScreen
        submitLabel={id ? 'Save changes' : 'Add transaction'}
        onSubmit={submit}
        submitting={addMutation.isPending || updateMutation.isPending}
        error={serverError}
      >
        <SegmentedField control={control} name="type" label="Type" options={BUY_SELL_OPTIONS} />
        <DateField control={control} name="date" label="Date" />
        <NumberField control={control} name="quantity" label="Grams" />
        <NumberField control={control} name="amount" label="Amount paid (₹)" />
        <TextField control={control} name="platform" label="Platform" placeholder="SafeGold" />
      </FormScreen>
    </>
  );
}
