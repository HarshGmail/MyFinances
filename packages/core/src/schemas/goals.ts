import { z } from 'zod';
import type { GoalPayload } from '../types';

const MAX_ALLOCATION_PERCENT = 100;

export const goalAllocationSchema = z.object({
  assetType: z.enum(['stock', 'mutualFund', 'crypto', 'gold', 'epf', 'fd', 'rd']),
  assetKey: z.string().min(1),
  percent: z
    .number({ invalid_type_error: 'Enter a percentage' })
    .gt(0, 'Must be more than 0%')
    .max(MAX_ALLOCATION_PERCENT, 'Cannot exceed 100%'),
});

const optionalNumber = (schema: z.ZodNumber) => schema.optional();

export const goalFormSchema = z.object({
  goalName: z.string().trim().min(1, 'Goal name is required'),
  description: z.string().optional(),
  targetAmount: z
    .number({ required_error: 'Target is required', invalid_type_error: 'Target is required' })
    .gt(0, 'Target must be greater than 0'),
  targetDate: z.date({
    required_error: 'Target date is required',
    invalid_type_error: 'Target date is required',
  }),
  inflationAdjusted: z.boolean().optional(),
  expectedReturnPct: optionalNumber(z.number().min(-50, 'Too low').max(100, 'Too high')),
  plannedMonthly: optionalNumber(z.number().min(0, 'Cannot be negative')),
  manualAmount: optionalNumber(z.number().min(0, 'Cannot be negative')),
  allocations: z.array(goalAllocationSchema),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;

export function goalFormToPayload(values: GoalFormValues): GoalPayload {
  return {
    goalName: values.goalName.trim(),
    description: values.description?.trim() || undefined,
    targetAmount: values.targetAmount,
    targetDate: values.targetDate.toISOString(),
    inflationAdjusted: values.inflationAdjusted || undefined,
    expectedReturnPct: values.expectedReturnPct,
    plannedMonthly: values.plannedMonthly,
    manualAmount: values.manualAmount || undefined,
    allocations: values.allocations,
  };
}
