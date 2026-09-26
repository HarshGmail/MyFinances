import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAddExpenseTransactionMutation } from '@myfinances/core/api/mutations/expenseTransactions';
import {
  EXPENSE_TAGS,
  trackerEntryPayload,
  trackerEntrySchema,
  TrackerEntryValues,
} from '@myfinances/core/schemas/expenses';
import { DateField, NumberField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { Label } from '@/components/ui';

export default function AddExpenseScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useAddExpenseTransactionMutation();
  const { control, handleSubmit } = useForm<TrackerEntryValues>({
    resolver: zodResolver(trackerEntrySchema),
    defaultValues: { date: new Date(), name: '', category: '', notes: '' },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await addMutation.mutateAsync(trackerEntryPayload(values));
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Log expense' }} />
      <FormScreen
        submitLabel="Log expense"
        onSubmit={submit}
        submitting={addMutation.isPending}
        error={serverError}
      >
        <TextField control={control} name="name" label="What" placeholder="e.g. Groceries" />
        <NumberField control={control} name="amount" label="Amount (₹)" />
        <Controller
          control={control}
          name="category"
          render={({ field, fieldState }) => (
            <View className="gap-1.5">
              <Label>Category</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {EXPENSE_TAGS.map((tag) => {
                    const selected = field.value === tag;
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => field.onChange(tag)}
                        className={`h-9 justify-center rounded-full border px-3 ${selected ? 'border-foreground bg-foreground' : 'border-border'}`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          className={
                            selected
                              ? 'text-sm font-semibold text-background'
                              : 'text-sm text-foreground'
                          }
                        >
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              {fieldState.error ? (
                <Text className="text-xs text-loss">{fieldState.error.message}</Text>
              ) : null}
            </View>
          )}
        />
        <DateField control={control} name="date" label="Date" />
        <TextField control={control} name="notes" label="Notes (optional)" />
      </FormScreen>
    </>
  );
}
