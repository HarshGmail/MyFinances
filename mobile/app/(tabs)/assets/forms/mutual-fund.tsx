import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutualFundInfoFetchQuery } from '@myfinances/core/api/query/mutual-funds-info';
import { useAddMutualFundTransactionMutation } from '@myfinances/core/api/mutations/mutual-funds';
import {
  mutualFundTransactionSchema,
  MutualFundTransactionValues,
} from '@myfinances/core/schemas/transactions';
import { BUY_SELL_OPTIONS, DateField, NumberField, SegmentedField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { EmptyState, Label, LoadingState } from '@/components/ui';

export default function MutualFundTransactionForm() {
  const { fund } = useLocalSearchParams<{ fund?: string }>();
  const fundsQuery = useMutualFundInfoFetchQuery();
  const [selectedFund, setSelectedFund] = useState<string | undefined>(fund);
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useAddMutualFundTransactionMutation();
  const { control, handleSubmit } = useForm<MutualFundTransactionValues>({
    resolver: zodResolver(mutualFundTransactionSchema),
    defaultValues: { type: 'credit', date: new Date() },
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
    try {
      await addMutation.mutateAsync({
        type: values.type,
        date: values.date.toISOString(),
        fundPrice: values.amount / values.units,
        numOfUnits: values.units,
        amount: values.amount,
        fundName: selectedFund,
        platform,
      });
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Add MF transaction' }} />
      <FormScreen
        submitLabel="Add transaction"
        onSubmit={submit}
        submitting={addMutation.isPending}
        error={serverError}
      >
        <View className="gap-1.5">
          <Label>Fund</Label>
          {funds.length ? (
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
            <EmptyState message="Add a fund on the web first, then log its transactions here." />
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
