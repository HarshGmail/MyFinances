import { useMemo, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { UserGoal } from '@myfinances/core/types';
import {
  useAddGoalMutation,
  useDeleteGoalMutation,
  useUpdateGoalMutation,
} from '@myfinances/core/api/mutations/userGoals';
import { GoalsData, useGoalsData } from '@myfinances/core/hooks/useGoalsData';
import { GoalFormValues, goalFormSchema, goalFormToPayload } from '@myfinances/core/schemas/goals';
import {
  blendedExpectedReturn,
  computeGoalValue,
  scaledCashFlows,
  trailingMonthlyContribution,
} from '@myfinances/core/calc/goals';
import { DateField, NumberField, TextField } from '@/components/form';
import { FormScreen, errorMessage } from '@/components/FormScreen';
import { EmptyState, Label, LoadingState } from '@/components/ui';
import { colors } from '@/lib/theme';
import { GoalAllocationEditor, hasOverAllocation } from '@/features/goals/GoalAllocationEditor';
import { formatRupees } from '@/features/goals/goalDisplay';

const OVER_ALLOCATED_MESSAGE = 'Some holdings are allocated beyond what is free. Lower them first.';

function goalToFormValues(goal: UserGoal): GoalFormValues {
  return {
    goalName: goal.goalName,
    description: goal.description ?? '',
    targetAmount: goal.targetAmount,
    targetDate: new Date(goal.targetDate),
    inflationAdjusted: goal.inflationAdjusted ?? false,
    expectedReturnPct: goal.expectedReturnPct,
    plannedMonthly: goal.plannedMonthly,
    manualAmount: goal.manualAmount,
    allocations: goal.allocations.map((allocation) => ({ ...allocation })),
  };
}

const EMPTY_FORM_VALUES: Partial<GoalFormValues> = {
  goalName: '',
  description: '',
  targetAmount: undefined,
  targetDate: undefined,
  inflationAdjusted: false,
  expectedReturnPct: undefined,
  plannedMonthly: undefined,
  manualAmount: undefined,
  allocations: [],
};

export default function GoalEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goalsData = useGoalsData();
  const existing = id ? goalsData.goals.find((goal) => goal._id === id) : undefined;

  if (id && goalsData.isLoading) return <LoadingState />;
  if (id && !existing) return <EmptyState message="This goal no longer exists." />;

  return <GoalForm key={existing?._id ?? 'new'} id={id} initial={existing} goalsData={goalsData} />;
}

function GoalForm({
  id,
  initial,
  goalsData,
}: {
  id?: string;
  initial?: UserGoal;
  goalsData: GoalsData;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const addMutation = useAddGoalMutation();
  const updateMutation = useUpdateGoalMutation();
  const deleteMutation = useDeleteGoalMutation();
  const { holdings, holdingsByKey, inflationPct, allocatedByHolding, isHoldingsLoading } =
    goalsData;

  const { control, handleSubmit, formState } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: initial ? goalToFormValues(initial) : EMPTY_FORM_VALUES,
  });

  const allocations = useWatch({ control, name: 'allocations' });
  const manualAmount = useWatch({ control, name: 'manualAmount' });
  const allocated = allocatedByHolding(id);

  const defaults = useMemo(() => {
    const value = computeGoalValue(
      { allocations: allocations.filter((line) => Number.isFinite(line.percent)), manualAmount },
      holdingsByKey
    );
    return {
      returnPct: blendedExpectedReturn(value).pct,
      trailingMonthly: trailingMonthlyContribution(scaledCashFlows(value.lines)),
    };
  }, [allocations, manualAmount, holdingsByKey]);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    if (hasOverAllocation(values.allocations, allocated)) {
      setServerError(OVER_ALLOCATED_MESSAGE);
      return;
    }
    try {
      const payload = goalFormToPayload(values);
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
            router.dismissTo('/more/goals');
          } catch (error) {
            setServerError(errorMessage(error));
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit goal' : 'Add goal' }} />
      <FormScreen
        submitLabel={id ? 'Save changes' : 'Add goal'}
        onSubmit={submit}
        submitting={addMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
        error={serverError}
      >
        <TextField
          control={control}
          name="goalName"
          label="Goal"
          placeholder="e.g. House down payment"
        />
        <NumberField control={control} name="targetAmount" label="Target amount (₹)" />
        <DateField control={control} name="targetDate" label="Target date" allowFuture />

        <Controller
          control={control}
          name="inflationAdjusted"
          render={({ field }) => (
            <View className="gap-1 rounded-lg border border-border bg-card px-3 py-3">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-sm text-foreground">Adjust target for inflation</Text>
                <Switch
                  value={Boolean(field.value)}
                  onValueChange={field.onChange}
                  trackColor={{ false: colors.accent, true: colors.gain }}
                  thumbColor={colors.foreground}
                  ios_backgroundColor={colors.accent}
                />
              </View>
              <Label>
                {`Treats the target as today's money and grows it by ${inflationPct.toFixed(1)}% a year until the target date.`}
              </Label>
            </View>
          )}
        />

        <Controller
          control={control}
          name="allocations"
          render={({ field }) => (
            <GoalAllocationEditor
              value={field.value}
              onChange={field.onChange}
              holdings={holdings}
              holdingsByKey={holdingsByKey}
              allocated={allocated}
              errors={
                Array.isArray(formState.errors.allocations)
                  ? formState.errors.allocations
                  : undefined
              }
              isLoading={isHoldingsLoading}
            />
          )}
        />

        <NumberField
          control={control}
          name="manualAmount"
          label="Other savings (₹, optional)"
          placeholder="Cash or accounts not tracked here"
        />
        <NumberField
          control={control}
          name="expectedReturnPct"
          label="Expected return (% p.a., optional)"
          placeholder={`Blended default ${defaults.returnPct.toFixed(1)}%`}
        />
        <NumberField
          control={control}
          name="plannedMonthly"
          label="Planned monthly investment (₹, optional)"
          placeholder={`Auto from last 12 months: ${formatRupees(defaults.trailingMonthly)}`}
        />
        <TextField control={control} name="description" label="Description (optional)" />

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
