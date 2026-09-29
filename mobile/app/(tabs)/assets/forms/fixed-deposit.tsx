import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFixedDepositsQuery } from '@myfinances/core/api/query/fixed-deposits';
import {
  useFixedDepositMutation,
  useUpdateFixedDepositMutation,
  useDeleteFixedDepositMutation,
} from '@myfinances/core/api/mutations/fixed-deposits';
import {
  fixedDepositEntrySchema,
  FixedDepositEntryValues,
} from '@myfinances/core/schemas/transactions';
import { DateField, NumberField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { LoadingState } from '@/components/ui';

export default function FixedDepositScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const depositsQuery = useFixedDepositsQuery();
  const existing = id ? depositsQuery.data?.find((d) => d._id === id) : undefined;

  if (id && !existing) return <LoadingState />;

  return <FixedDepositForm id={id} initial={existing} />;
}

function FixedDepositForm({
  id,
  initial,
}: {
  id?: string;
  initial?: {
    fixedDepositName: string;
    amountInvested: number;
    rateOfInterest: number;
    platform?: string;
    dateOfCreation: Date | string;
    dateOfMaturity: Date | string;
  };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useFixedDepositMutation();
  const updateMutation = useUpdateFixedDepositMutation();
  const deleteMutation = useDeleteFixedDepositMutation();

  const { control, handleSubmit } = useForm<FixedDepositEntryValues>({
    resolver: zodResolver(fixedDepositEntrySchema),
    defaultValues: initial
      ? {
          fixedDepositName: initial.fixedDepositName,
          amountInvested: initial.amountInvested,
          rateOfInterest: initial.rateOfInterest,
          platform: initial.platform ?? '',
          dateOfCreation: new Date(initial.dateOfCreation),
          dateOfMaturity: new Date(initial.dateOfMaturity),
        }
      : {
          fixedDepositName: '',
          platform: '',
          dateOfCreation: new Date(),
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
    Alert.alert('Delete fixed deposit?', initial?.fixedDepositName, [
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
          title: id ? 'Edit fixed deposit' : 'Add fixed deposit',
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
          name="fixedDepositName"
          label="Name"
          placeholder="e.g. SBI FD"
        />
        <NumberField control={control} name="amountInvested" label="Principal (₹)" />
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
            <Text className="text-sm text-loss">Delete fixed deposit</Text>
          </Pressable>
        )}
      </FormScreen>
    </>
  );
}
