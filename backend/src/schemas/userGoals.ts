import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const goalAssetTypes = ['stock', 'mutualFund', 'crypto', 'gold', 'epf', 'fd', 'rd'] as const;

export const goalAllocationSchema = z.object({
  assetType: z.enum(goalAssetTypes),
  assetKey: z.string().min(1),
  percent: z.number().positive().max(100),
});

const toDate = (arg: unknown) => (typeof arg === 'string' ? new Date(arg) : arg);

const goalFieldsSchema = z.object({
  goalName: z.string().trim().min(1),
  description: z.string().optional(),
  targetAmount: z.number().positive(),
  targetDate: z.preprocess(toDate, z.date()),
  inflationAdjusted: z.boolean().optional(),
  expectedReturnPct: z.number().min(-50).max(100).optional(),
  plannedMonthly: z.number().nonnegative().optional(),
  manualAmount: z.number().nonnegative().optional(),
  allocations: z.array(goalAllocationSchema).default([]),
});

const allocationIdentity = ({ assetType, assetKey }: GoalAllocation) => `${assetType}:${assetKey}`;

function rejectDuplicateAllocations(
  { allocations }: { allocations: GoalAllocation[] },
  ctx: z.RefinementCtx
) {
  const seen = new Set<string>();
  allocations.forEach((allocation, index) => {
    const identity = allocationIdentity(allocation);
    if (seen.has(identity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allocations', index],
        message: `${allocation.assetKey} is allocated more than once in this goal`,
      });
    }
    seen.add(identity);
  });
}

export const goalInputSchema = goalFieldsSchema.superRefine(rejectDuplicateAllocations);

export const userGoalSchema = goalFieldsSchema
  .extend({
    _id: z.instanceof(ObjectId).optional(),
    userId: z.instanceof(ObjectId),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .superRefine(rejectDuplicateAllocations);

export type GoalAssetType = (typeof goalAssetTypes)[number];
export type GoalAllocation = z.infer<typeof goalAllocationSchema>;
export type GoalInput = z.infer<typeof goalInputSchema>;
export type UserGoal = z.infer<typeof userGoalSchema>;

export const goalInputFieldNames = Object.keys(goalFieldsSchema.shape) as (keyof GoalInput)[];
