import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUserGoalsQuery } from '@myfinances/core/api/query/userGoals';
import {
  useAddGoalMutation,
  useUpdateGoalMutation,
  useDeleteGoalMutation,
  AddGoalPayload,
} from '@myfinances/core/api/mutations/userGoals';
import { useGoalHoldingValues } from '@myfinances/core/hooks/useGoalHoldingValues';
import { NumberField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { Label, LoadingState } from '@/components/ui';

const goalSchema = z.object({
  goalName: z.string().min(1, 'Name is required'),
  targetAmount: z.number().min(1, 'Target must be greater than 0'),
  description: z.string().optional(),
  goldAlloted: z.number().min(0).optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

export default function GoalEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goalsQuery = useUserGoalsQuery();
  const existing = id ? goalsQuery.data?.find((g) => g._id === id) : undefined;

  if (id && !existing) return <LoadingState />;

  return <GoalForm id={id} initial={existing} />;
}

function GoalForm({
  id,
  initial,
}: {
  id?: string;
  initial?: {
    goalName: string;
    targetAmount?: number;
    description?: string;
    goldAlloted?: number;
    stockSymbols?: string[];
    mutualFundIds?: string[];
    cryptoCurrency?: string[];
  };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [stockSymbols, setStockSymbols] = useState<string[]>(initial?.stockSymbols ?? []);
  const [mutualFundIds, setMutualFundIds] = useState<string[]>(initial?.mutualFundIds ?? []);
  const [cryptoCurrency, setCryptoCurrency] = useState<string[]>(initial?.cryptoCurrency ?? []);

  const addMutation = useAddGoalMutation();
  const updateMutation = useUpdateGoalMutation();
  const deleteMutation = useDeleteGoalMutation();

  const { stockNames, coinNames, mfInfo } = useGoalHoldingValues();

  const { control, handleSubmit } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: initial
      ? {
          goalName: initial.goalName,
          targetAmount: initial.targetAmount,
          description: initial.description ?? '',
          goldAlloted: initial.goldAlloted,
        }
      : {
          goalName: '',
          targetAmount: undefined,
          description: '',
          goldAlloted: undefined,
        },
  });

  const toggle = (list: string[], value: string): string[] => {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  };

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const payload: AddGoalPayload = {
        goalName: values.goalName,
        targetAmount: values.targetAmount,
        description: values.description || undefined,
        goldAlloted: values.goldAlloted || undefined,
        stockSymbols,
        mutualFundIds,
        cryptoCurrency,
      };

      if (id) await updateMutation.mutateAsync({ id, data: payload });
      else await addMutation.mutateAsync(payload);
      router.back();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  const handleDelete = () => {
    Alert.alert('Delete goal?', initial?.goalName, [
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

  const fundOptions = mfInfo
    .filter((f) => f.fundName)
    .map((f) => ({ id: f._id, label: f.fundName! }));

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit goal' : 'Add goal' }} />
      <FormScreen
        submitLabel={id ? 'Save changes' : 'Add goal'}
        onSubmit={submit}
        submitting={addMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
        error={serverError}
      >
        <TextField control={control} name="goalName" label="Goal" />
        <NumberField control={control} name="targetAmount" label="Target amount (₹)" />
        <TextField control={control} name="description" label="Description (optional)" />
        <NumberField control={control} name="goldAlloted" label="Gold allotted (grams, optional)" />

        <View className="gap-1.5">
          <Label>Stocks</Label>
          {stockNames.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {stockNames.map((name) => {
                const selected = stockSymbols.includes(name);
                return (
                  <Pressable
                    key={name}
                    onPress={() => setStockSymbols(toggle(stockSymbols, name))}
                    className={`h-9 justify-center rounded-full border px-3 ${selected ? 'border-foreground bg-foreground' : 'border-border'}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text
                      className={
                        selected
                          ? 'text-sm font-semibold text-background'
                          : 'text-sm text-foreground'
                      }
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text className="text-xs text-muted">None held</Text>
          )}
        </View>

        <View className="gap-1.5">
          <Label>Mutual funds</Label>
          {fundOptions.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {fundOptions.map(({ id: fundId, label }) => {
                const selected = mutualFundIds.includes(fundId);
                return (
                  <Pressable
                    key={fundId}
                    onPress={() => setMutualFundIds(toggle(mutualFundIds, fundId))}
                    className={`h-9 justify-center rounded-full border px-3 ${selected ? 'border-foreground bg-foreground' : 'border-border'}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text
                      className={
                        selected
                          ? 'text-sm font-semibold text-background'
                          : 'text-sm text-foreground'
                      }
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text className="text-xs text-muted">None held</Text>
          )}
        </View>

        <View className="gap-1.5">
          <Label>Crypto</Label>
          {coinNames.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {coinNames.map((name) => {
                const selected = cryptoCurrency.includes(name);
                return (
                  <Pressable
                    key={name}
                    onPress={() => setCryptoCurrency(toggle(cryptoCurrency, name))}
                    className={`h-9 justify-center rounded-full border px-3 ${selected ? 'border-foreground bg-foreground' : 'border-border'}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text
                      className={
                        selected
                          ? 'text-sm font-semibold text-background'
                          : 'text-sm text-foreground'
                      }
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text className="text-xs text-muted">None held</Text>
          )}
        </View>

        {id && (
          <Pressable
            onPress={handleDelete}
            className="items-center py-3"
            accessibilityRole="button"
          >
            <Text className="text-sm text-loss">Delete goal</Text>
          </Pressable>
        )}
      </FormScreen>
    </>
  );
}
