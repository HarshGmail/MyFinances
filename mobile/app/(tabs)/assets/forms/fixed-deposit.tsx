import { useState } from 'react';
import { Stack, router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFixedDepositMutation } from '@myfinances/core/api/mutations/fixed-deposits';
import { fixedDepositSchema, FixedDepositValues } from '@myfinances/core/schemas/transactions';
import { NumberField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';

export default function AddFixedDepositForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const mutation = useFixedDepositMutation();
  const { control, handleSubmit } = useForm<FixedDepositValues>({
    resolver: zodResolver(fixedDepositSchema),
    defaultValues: {
      fixedDepositName: '',
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
      <Stack.Screen options={{ title: 'Add fixed deposit' }} />
      <FormScreen
        submitLabel="Add deposit"
        onSubmit={submit}
        submitting={mutation.isPending}
        error={serverError}
      >
        <TextField
          control={control}
          name="fixedDepositName"
          label="Name"
          placeholder="e.g. SBI FD"
          autoCorrect={false}
        />
        <NumberField control={control} name="amountInvested" label="Principal (₹)" />
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
