import { useState } from 'react';
import { Stack, router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRecurringDepositMutation } from '@myfinances/core/api/mutations/recurring-deposits';
import {
  recurringDepositSchema,
  RecurringDepositValues,
} from '@myfinances/core/schemas/transactions';
import { NumberField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';

export default function AddRecurringDepositForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const mutation = useRecurringDepositMutation();
  const { control, handleSubmit } = useForm<RecurringDepositValues>({
    resolver: zodResolver(recurringDepositSchema),
    defaultValues: {
      recurringDepositName: '',
      platform: '',
      dateOfCreation: '',
      dateOfMaturity: '',
    },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await mutation.mutateAsync(values);
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Add recurring deposit' }} />
      <FormScreen
        submitLabel="Add deposit"
        onSubmit={submit}
        submitting={mutation.isPending}
        error={serverError}
      >
        <TextField
          control={control}
          name="recurringDepositName"
          label="Name"
          placeholder="e.g. SBI RD"
          autoCorrect={false}
        />
        <NumberField control={control} name="monthlyDeposit" label="Monthly deposit (₹)" />
        <NumberField control={control} name="amountInvested" label="Total deposited so far (₹)" />
        <NumberField control={control} name="rateOfInterest" label="Interest rate (% p.a.)" />
        <TextField
          control={control}
          name="dateOfCreation"
          label="Start date"
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
        />
        <TextField
          control={control}
          name="dateOfMaturity"
          label="Maturity date"
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
        />
        <TextField
          control={control}
          name="platform"
          label="Bank / platform"
          placeholder="e.g. State Bank of India"
          autoCorrect={false}
        />
      </FormScreen>
    </>
  );
}
