'use client';

import { useMemo } from 'react';
import { FormProvider, useForm, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isSameDay, min as earliestDate, startOfDay } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  blendedExpectedReturn,
  computeGoalValue,
  freePercent,
  holdingKey,
  isOverAllocated,
} from '@myfinances/core/calc/goals';
import {
  useAddGoalMutation,
  useUpdateGoalMutation,
} from '@myfinances/core/api/mutations/userGoals';
import type { GoalsData } from '@myfinances/core/hooks/useGoalsData';
import {
  goalFormSchema,
  goalFormToPayload,
  type GoalFormValues,
} from '@myfinances/core/schemas/goals';
import type { UserGoal } from '@myfinances/core/types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AllocationEditor, sanitiseAllocations } from './AllocationEditor';
import { ToggleSwitch } from './ToggleSwitch';
import { formatPercentNumber, mutationErrorMessage } from './goalDisplay';

const CALENDAR_YEARS_AHEAD = 60;

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: UserGoal;
  goalsData: GoalsData;
}

function initialValues(goal?: UserGoal): Partial<GoalFormValues> {
  if (!goal) {
    return { goalName: '', description: '', inflationAdjusted: false, allocations: [] };
  }
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

function parseOptionalNumber(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type OptionalNumberField = 'targetAmount' | 'expectedReturnPct' | 'plannedMonthly' | 'manualAmount';

function NumberField({
  control,
  name,
  label,
  placeholder,
  description,
  step,
}: {
  control: Control<GoalFormValues>;
  name: OptionalNumberField;
  label: string;
  placeholder?: string;
  description?: string;
  step?: number;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="decimal"
              step={step ?? 'any'}
              placeholder={placeholder}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ''}
              onChange={(event) => field.onChange(parseOptionalNumber(event.target.value))}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function GoalForm({
  goal,
  goalsData,
  onDone,
}: {
  goal?: UserGoal;
  goalsData: GoalsData;
  onDone: () => void;
}) {
  const { holdings, holdingsByKey, isHoldingsLoading, allocatedByHolding } = goalsData;
  const addGoal = useAddGoalMutation();
  const updateGoal = useUpdateGoalMutation();
  const isPending = addGoal.isPending || updateGoal.isPending;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: initialValues(goal),
  });

  const allocatedElsewhere = allocatedByHolding(goal?._id);
  const watchedAllocations = useWatch({ control: form.control, name: 'allocations' });
  const manualAmount = useWatch({ control: form.control, name: 'manualAmount' });

  const blendedDefaultPct = useMemo(
    () =>
      blendedExpectedReturn(
        computeGoalValue(
          { allocations: sanitiseAllocations(watchedAllocations), manualAmount },
          holdingsByKey
        )
      ).blendedPct,
    [watchedAllocations, manualAmount, holdingsByKey]
  );

  const hasOverAllocation = (values: GoalFormValues) =>
    values.allocations.some((allocation) =>
      isOverAllocated(
        allocation.percent,
        freePercent(allocatedElsewhere, holdingKey(allocation.assetType, allocation.assetKey))
      )
    );

  const onSubmit = (values: GoalFormValues) => {
    if (hasOverAllocation(values)) {
      toast.error('Some holdings are over-allocated', {
        description: 'Lower the highlighted percentages so no holding goes past 100% overall.',
      });
      return;
    }
    const payload = goalFormToPayload(values);
    const callbacks = {
      onSuccess: () => {
        toast.success(goal ? 'Goal updated' : 'Goal created');
        onDone();
      },
      onError: (error: unknown) => {
        toast.error(goal ? 'Could not update goal' : 'Could not create goal', {
          description: mutationErrorMessage(error),
        });
      },
    };
    if (goal) {
      updateGoal.mutate({ id: goal._id, data: payload }, callbacks);
    } else {
      addGoal.mutate(payload, callbacks);
    }
  };

  const today = startOfDay(new Date());
  const savedTargetDate = goal ? startOfDay(new Date(goal.targetDate)) : null;
  const isSelectableDate = (date: Date) =>
    date > today || (savedTargetDate !== null && isSameDay(date, savedTargetDate));
  const calendarStart = savedTargetDate ? earliestDate([today, savedTargetDate]) : today;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="goalName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. House down payment" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            control={form.control}
            name="targetAmount"
            label="Target amount (₹)"
            placeholder="2500000"
            step={1000}
          />
          <FormField
            control={form.control}
            name="targetDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Target date</FormLabel>
                <Popover modal>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      defaultMonth={field.value}
                      disabled={(date) => !isSelectableDate(date)}
                      captionLayout="dropdown"
                      startMonth={calendarStart}
                      endMonth={new Date(today.getFullYear() + CALENDAR_YEARS_AHEAD, 11)}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="inflationAdjusted"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div className="space-y-1">
                <FormLabel>Adjust for inflation</FormLabel>
                <FormDescription>
                  Treat the target as today&apos;s money. It grows with average inflation up to the
                  target date, so ₹10L in 10 years means what ₹10L buys now.
                </FormDescription>
              </div>
              <FormControl>
                <ToggleSwitch checked={field.value ?? false} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            control={form.control}
            name="expectedReturnPct"
            label="Expected return (% / yr)"
            placeholder={`Auto: ${formatPercentNumber(blendedDefaultPct)}%`}
            description="Leave empty to blend from the linked holdings."
            step={0.1}
          />
          <NumberField
            control={form.control}
            name="plannedMonthly"
            label="Planned monthly (₹)"
            placeholder="Auto from your last 12 months"
            description="What you intend to put in each month."
            step={500}
          />
        </div>

        <NumberField
          control={form.control}
          name="manualAmount"
          label="Other savings (₹)"
          placeholder="0"
          description="Cash or anything the app doesn't track, counted toward this goal as-is."
          step={1000}
        />

        <AllocationEditor
          holdings={holdings}
          holdingsByKey={holdingsByKey}
          allocatedElsewhere={allocatedElsewhere}
          isHoldingsLoading={isHoldingsLoading}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Why this goal matters, or anything to remember"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}
          </Button>
        </DialogFooter>
      </form>
    </FormProvider>
  );
}

export function GoalDialog({ open, onOpenChange, goal, goalsData }: GoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit goal' : 'New goal'}</DialogTitle>
          <DialogDescription>
            Set a target and a date, then link the holdings that will pay for it.
          </DialogDescription>
        </DialogHeader>
        <GoalForm
          key={goal?._id ?? 'new'}
          goal={goal}
          goalsData={goalsData}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
