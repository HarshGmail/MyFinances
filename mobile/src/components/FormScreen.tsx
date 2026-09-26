import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Button } from './ui';

export function FormScreen({
  children,
  submitLabel,
  onSubmit,
  submitting,
  error,
}: {
  children: ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  submitting: boolean;
  error?: string | null;
}) {
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-12 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {children}
        {error ? <Text className="text-sm text-loss">{error}</Text> : null}
        <Button label={submitLabel} onPress={onSubmit} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Something went wrong';
}
