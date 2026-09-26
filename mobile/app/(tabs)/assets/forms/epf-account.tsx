import { useState } from 'react';
import { Stack, router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAddEpfAccountMutation } from '@myfinances/core/api/mutations/epf';
import { epfAccountSchema, EpfAccountValues } from '@myfinances/core/schemas/transactions';
import { DateField, NumberField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';

export default function AddEpfAccountForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const mutation = useAddEpfAccountMutation();
  const { control, handleSubmit } = useForm<EpfAccountValues>({
    resolver: zodResolver(epfAccountSchema),
    defaultValues: {
      organizationName: '',
      creditDay: 1,
      startDate: new Date(),
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
      <Stack.Screen options={{ title: 'Add EPF account' }} />
      <FormScreen
        submitLabel="Add account"
        onSubmit={submit}
        submitting={mutation.isPending}
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
      </FormScreen>
    </>
  );
}
