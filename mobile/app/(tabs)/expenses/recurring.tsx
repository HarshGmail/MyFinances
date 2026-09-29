import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useExpensesQuery } from '@myfinances/core/api/query/expenses';
import {
  useAddExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} from '@myfinances/core/api/mutations/expenses';
import {
  EXPENSE_FREQUENCIES,
  EXPENSE_TAGS,
  expenseSchema,
  ExpenseFormValues,
} from '@myfinances/core/schemas/expenses';
import { NumberField, SegmentedField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { Label, LoadingState } from '@/components/ui';

export default function RecurringExpenseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const expensesQuery = useExpensesQuery();
  const existing = id ? expensesQuery.data?.find((e) => e._id === id) : undefined;

  if (id && !existing) return <LoadingState />;

  return <RecurringExpenseForm id={id} initial={existing} />;
}

function RecurringExpenseForm({
  id,
  initial,
}: {
  id?: string;
  initial?: {
    tag: string;
    expenseAmount: number;
    expenseName: string;
    expenseFrequency: string;
    isFixed?: boolean;
  };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useAddExpenseMutation();
  const updateMutation = useUpdateExpenseMutation();
  const deleteMutation = useDeleteExpenseMutation();

  const { control, handleSubmit } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initial
      ? {
          tag: initial.tag,
          expenseName: initial.expenseName,
          expenseAmount: initial.expenseAmount,
          expenseFrequency: initial.expenseFrequency as ExpenseFormValues['expenseFrequency'],
          isFixed: initial.isFixed ?? false,
        }
      : {
          tag: '',
          expenseName: '',
          expenseAmount: undefined,
          expenseFrequency: 'monthly',
          isFixed: false,
        },
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

  const handleDelete = () => {
    Alert.alert('Delete recurring expense?', initial?.expenseName, [
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
      <Stack.Screen options={{ title: id ? 'Edit recurring expense' : 'Add recurring expense' }} />
      <FormScreen
        submitLabel={id ? 'Save changes' : 'Add expense'}
        onSubmit={submit}
        submitting={addMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
        error={serverError}
      >
        <TextField control={control} name="expenseName" label="Name" placeholder="e.g. Rent" />
        <NumberField control={control} name="expenseAmount" label="Amount (₹)" />
        <SegmentedField
          control={control}
          name="expenseFrequency"
          label="Frequency"
          options={EXPENSE_FREQUENCIES.filter((f) => f.value !== 'one-time').map((f) => ({
            value: f.value,
            label: f.label,
          }))}
        />
        <Controller
          control={control}
          name="tag"
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

        {id && (
          <Pressable
            onPress={handleDelete}
            className="items-center py-3"
            accessibilityRole="button"
          >
            <Text className="text-sm text-loss">Delete recurring expense</Text>
          </Pressable>
        )}
      </FormScreen>
    </>
  );
}
