import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRecurringDepositsQuery } from '@myfinances/core/api/query/recurring-deposits';
import {
  useRecurringDepositMutation,
  useUpdateRecurringDepositMutation,
  useDeleteRecurringDepositMutation,
} from '@myfinances/core/api/mutations/recurring-deposits';
import {
  recurringDepositEntrySchema,
  RecurringDepositEntryValues,
} from '@myfinances/core/schemas/transactions';
import { DateField, NumberField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { LoadingState } from '@/components/ui';

export default function RecurringDepositScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const depositsQuery = useRecurringDepositsQuery();
  const existing = id ? depositsQuery.data?.find((d) => d._id === id) : undefined;

  if (id && !existing) return <LoadingState />;

  return <RecurringDepositForm id={id} initial={existing} />;
}

function RecurringDepositForm({
  id,
  initial,
}: {
  id?: string;
  initial?: {
    recurringDepositName: string;
    monthlyDeposit: number;
    amountInvested: number;
    rateOfInterest: number;
    platform?: string;
    dateOfCreation: Date | string;
    dateOfMaturity: Date | string;
  };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useRecurringDepositMutation();
  const updateMutation = useUpdateRecurringDepositMutation();
  const deleteMutation = useDeleteRecurringDepositMutation();

  const { control, handleSubmit } = useForm<RecurringDepositEntryValues>({
    resolver: zodResolver(recurringDepositEntrySchema),
    defaultValues: initial
      ? {
          recurringDepositName: initial.recurringDepositName,
          monthlyDeposit: initial.monthlyDeposit,
          amountInvested: initial.amountInvested,
          rateOfInterest: initial.rateOfInterest,
          platform: initial.platform ?? '',
          dateOfCreation: new Date(initial.dateOfCreation),
          dateOfMaturity: new Date(initial.dateOfMaturity),
        }
      : {
          recurringDepositName: '',
          platform: '',
          dateOfCreation: new Date(),
          monthlyDeposit: undefined,
          amountInvested: undefined,
          rateOfInterest: undefined,
          dateOfMaturity: undefined,
        },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const payload = {
        ...values,
        platform: values.platform || undefined,
        dateOfCreation: values.dateOfCreation.toISOString(),
        dateOfMaturity: values.dateOfMaturity.toISOString(),
      };
      if (id) await updateMutation.mutateAsync({ id, data: payload });
      else await addMutation.mutateAsync(payload);
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  const handleDelete = () => {
    Alert.alert('Delete recurring deposit?', initial?.recurringDepositName, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(id!);
            router.back();
          } catch (error) {
            setServerError(errorMessage(error));
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: id ? 'Edit recurring deposit' : 'Add recurring deposit',
        }}
      />
      <FormScreen
        submitLabel={id ? 'Save changes' : 'Add deposit'}
        onSubmit={submit}
        submitting={addMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
        error={serverError}
      >
        <TextField
          control={control}
          name="recurringDepositName"
          label="Name"
          placeholder="e.g. SBI RD"
        />
        <NumberField control={control} name="monthlyDeposit" label="Monthly deposit (₹)" />
        <NumberField control={control} name="amountInvested" label="Total deposited so far (₹)" />
        <NumberField control={control} name="rateOfInterest" label="Interest rate (% p.a.)" />
        <DateField control={control} name="dateOfCreation" label="Start date" />
        <DateField control={control} name="dateOfMaturity" label="Maturity date" allowFuture />
        <TextField control={control} name="platform" label="Bank / platform" />

        {id && (
          <Pressable
            onPress={handleDelete}
            className="items-center py-3"
            accessibilityRole="button"
          >
            <Text className="text-sm text-loss">Delete recurring deposit</Text>
          </Pressable>
        )}
      </FormScreen>
    </>
  );
}
