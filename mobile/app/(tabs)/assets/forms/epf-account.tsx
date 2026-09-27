import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEpfQuery } from '@myfinances/core/api/query/epf';
import {
  useAddEpfAccountMutation,
  useDeleteEpfAccountMutation,
  useUpdateEpfAccountMutation,
} from '@myfinances/core/api/mutations/epf';
import type { EpfAccount } from '@myfinances/core/types';
import { epfAccountSchema, EpfAccountValues } from '@myfinances/core/schemas/transactions';
import { DateField, NumberField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { LoadingState } from '@/components/ui';

export default function EpfAccountScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const accountsQuery = useEpfQuery();
  const existing = id ? accountsQuery.data?.find((account) => account._id === id) : undefined;

  if (id && !existing) return <LoadingState />;

  return <EpfAccountForm id={id} initial={existing} />;
}

function EpfAccountForm({ id, initial }: { id?: string; initial?: EpfAccount }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useAddEpfAccountMutation();
  const updateMutation = useUpdateEpfAccountMutation();
  const deleteMutation = useDeleteEpfAccountMutation();
  const { control, handleSubmit } = useForm<EpfAccountValues>({
    resolver: zodResolver(epfAccountSchema),
    defaultValues: initial
      ? {
          organizationName: initial.organizationName,
          epfAmount: initial.epfAmount,
          creditDay: initial.creditDay,
          startDate: new Date(initial.startDate),
        }
      : { organizationName: '', creditDay: 1, startDate: new Date() },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (id) await updateMutation.mutateAsync({ id, data: values });
      else await addMutation.mutateAsync(values);
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  const confirmDelete = () =>
    Alert.alert(
      'Delete EPF account?',
      `${initial?.organizationName}. Its contributions drop out of the EPF balance.`,
      [
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
      ]
    );

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit EPF account' : 'Add EPF account' }} />
      <FormScreen
        submitLabel={id ? 'Save changes' : 'Add account'}
        onSubmit={submit}
        submitting={addMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
        error={serverError}
      >
        <TextField control={control} name="organizationName" label="Employer" />
        <NumberField
          control={control}
          name="epfAmount"
          label="Monthly EPF credit (₹)"
          placeholder="Employee + employer share"
        />
        <NumberField control={control} name="creditDay" label="Credit day of month (1-31)" />
        <DateField control={control} name="startDate" label="Start date" />
        {id && (
          <Pressable
            onPress={confirmDelete}
            className="items-center py-3"
            accessibilityRole="button"
          >
            <Text className="text-sm text-loss">Delete EPF account</Text>
          </Pressable>
        )}
      </FormScreen>
    </>
  );
}
