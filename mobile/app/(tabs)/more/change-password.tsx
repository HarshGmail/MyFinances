import { useState } from 'react';
import { Stack, router } from 'expo-router';
import { Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useChangePasswordMutation } from '@myfinances/core/api/mutations/auth';
import { changePasswordSchema, ChangePasswordValues } from '@myfinances/core/schemas/auth';
import { TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';

export default function ChangePasswordScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const mutation = useChangePasswordMutation();
  const { control, handleSubmit } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      Alert.alert('Password changed', 'Your password has been updated successfully.');
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Change password' }} />
      <FormScreen
        submitLabel="Change password"
        onSubmit={submit}
        submitting={mutation.isPending}
        error={serverError}
      >
        <TextField
          control={control}
          name="currentPassword"
          label="Current password"
          secureTextEntry
          autoCapitalize="none"
        />
        <TextField
          control={control}
          name="newPassword"
          label="New password"
          secureTextEntry
          autoCapitalize="none"
        />
        <TextField
          control={control}
          name="confirmPassword"
          label="Confirm new password"
          secureTextEntry
          autoCapitalize="none"
        />
      </FormScreen>
    </>
  );
}
