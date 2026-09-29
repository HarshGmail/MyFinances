import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutualFundInfoFetchQuery } from '@myfinances/core/api/query/mutual-funds-info';
import {
  useAddMutualFundTransactionMutation,
  useUpdateMutualFundTransactionMutation,
} from '@myfinances/core/api/mutations/mutual-funds';
import { useMutualFundTransactionsQuery } from '@myfinances/core/api/query/mutual-funds';
import type { MutualFundTransaction } from '@myfinances/core/types';
import {
  mutualFundTransactionSchema,
  MutualFundTransactionValues,
} from '@myfinances/core/schemas/transactions';
import { BUY_SELL_OPTIONS, DateField, NumberField, SegmentedField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { AddButton, EmptyState, Label, LoadingState } from '@/components/ui';

export default function MutualFundTransactionScreen() {
  const { id, fund } = useLocalSearchParams<{ id?: string; fund?: string }>();
  const transactionsQuery = useMutualFundTransactionsQuery();
  const existing = id ? transactionsQuery.data?.find((tx) => tx.id === id) : undefined;

  if (id && !existing) return <LoadingState />;

  return (
    <MutualFundTransactionForm
      id={id}
      initialFund={existing?.fundName ?? fund}
      initial={existing}
    />
  );
}

function MutualFundTransactionForm({
  id,
  initialFund,
  initial,
}: {
  id?: string;
  initialFund?: string;
  initial?: MutualFundTransaction;
}) {
  const fundsQuery = useMutualFundInfoFetchQuery();
  const [selectedFund, setSelectedFund] = useState<string | undefined>(initialFund);
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useAddMutualFundTransactionMutation();
  const updateMutation = useUpdateMutualFundTransactionMutation();
  const { control, handleSubmit } = useForm<MutualFundTransactionValues>({
    resolver: zodResolver(mutualFundTransactionSchema),
    defaultValues: initial
      ? {
          type: initial.type,
          date: new Date(initial.date),
          amount: initial.amount,
          units: initial.numOfUnits,
        }
      : { type: 'credit', date: new Date() },
  });

  if (fundsQuery.isLoading) return <LoadingState />;
  const funds = (fundsQuery.data ?? []).filter((info) => info.fundName);
  const platform = funds.find((info) => info.fundName === selectedFund)?.platform;

  const submit = handleSubmit(async (values) => {
    if (!selectedFund) {
      setServerError('Pick a fund');
      return;
    }
    setServerError(null);
    const trade = {
      type: values.type,
      date: values.date.toISOString(),
      fundPrice: values.amount / values.units,
      numOfUnits: values.units,
      amount: values.amount,
    };
    try {
      if (id) await updateMutation.mutateAsync({ id, data: trade });
      else await addMutation.mutateAsync({ ...trade, fundName: selectedFund, platform });
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit MF transaction' : 'Add MF transaction' }} />
      <FormScreen
        submitLabel={id ? 'Save changes' : 'Add transaction'}
        onSubmit={submit}
        submitting={addMutation.isPending || updateMutation.isPending}
        error={serverError}
      >
        <View className="gap-1.5">
          <Label>Fund</Label>
          {id ? (
            <Text className="text-base text-foreground">{selectedFund}</Text>
          ) : funds.length ? (
            <View className="overflow-hidden rounded-lg border border-border">
              {funds.map((info, index) => {
                const selected = info.fundName === selectedFund;
                return (
                  <Pressable
                    key={info._id}
                    onPress={() => setSelectedFund(info.fundName)}
                    className={`px-3 py-3 ${index > 0 ? 'border-t border-border' : ''} ${selected ? 'bg-accent' : 'bg-card'}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      className={selected ? 'font-semibold text-foreground' : 'text-foreground'}
                      numberOfLines={2}
                    >
                      {info.fundName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <EmptyState message="No funds yet. Add one first." />
          )}
          {!id && (
            <AddButton
              label="Add a new fund"
              onPress={() => router.push('/assets/forms/mutual-fund-info')}
            />
          )}
        </View>
        <SegmentedField control={control} name="type" label="Type" options={BUY_SELL_OPTIONS} />
        <DateField control={control} name="date" label="Date" />
        <NumberField control={control} name="amount" label="Amount (₹)" />
        <NumberField control={control} name="units" label="Units" />
      </FormScreen>
    </>
  );
}
