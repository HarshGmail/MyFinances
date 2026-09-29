import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { ZodError } from 'zod';
import database from '../database';
import {
  GoalAllocation,
  GoalAssetType,
  goalInputFieldNames,
  goalInputSchema,
} from '../schemas/userGoals';
import { getUserFromRequest } from '../utils/jwtHelpers';
import logger from '../utils/logger';
import { deleteOwnedDocument, resolveOwnedFilter } from '../utils/ownedDocuments';

const GOALS_COLLECTION = 'userGoals';
const FULLY_ALLOCATED_PERCENT = 100;
const ALLOCATION_EPSILON = 0.001;

interface AllocationConflict {
  assetType: GoalAssetType;
  assetKey: string;
  availablePercent: number;
}

const allocationIdentity = ({
  assetType,
  assetKey,
}: Pick<GoalAllocation, 'assetType' | 'assetKey'>) => `${assetType}:${assetKey}`;

const roundPercent = (percent: number) => Math.round(percent * 100) / 100;

function sumAllocatedPercent(goals: { allocations?: GoalAllocation[] }[]) {
  const allocated = new Map<string, number>();
  for (const { allocations = [] } of goals) {
    for (const allocation of allocations) {
      const identity = allocationIdentity(allocation);
      allocated.set(identity, (allocated.get(identity) ?? 0) + allocation.percent);
    }
  }
  return allocated;
}

function findAllocationConflicts(
  allocations: GoalAllocation[],
  allocatedElsewhere: Map<string, number>
): AllocationConflict[] {
  return allocations.flatMap(({ assetType, assetKey, percent }) => {
    const alreadyAllocated =
      allocatedElsewhere.get(allocationIdentity({ assetType, assetKey })) ?? 0;
    if (alreadyAllocated + percent <= FULLY_ALLOCATED_PERCENT + ALLOCATION_EPSILON) return [];
    const availablePercent = roundPercent(Math.max(0, FULLY_ALLOCATED_PERCENT - alreadyAllocated));
    return [{ assetType, assetKey, availablePercent }];
  });
}

function describeConflict(
  { assetKey, availablePercent }: AllocationConflict,
  allocatedElsewhere: number
) {
  return `${assetKey} is already ${roundPercent(allocatedElsewhere)}% allocated to other goals — only ${availablePercent}% is free`;
}

async function checkAllocationCap(
  userId: ObjectId,
  allocations: GoalAllocation[],
  excludeGoalId?: ObjectId
) {
  if (allocations.length === 0) return [];
  const otherGoals = await database
    .getDb()
    .collection<{ allocations?: GoalAllocation[] }>(GOALS_COLLECTION)
    .find(
      { userId, ...(excludeGoalId && { _id: { $ne: excludeGoalId } }) },
      { projection: { allocations: 1 } }
    )
    .toArray();
  const allocatedElsewhere = sumAllocatedPercent(otherGoals);
  return findAllocationConflicts(allocations, allocatedElsewhere).map((conflict) => ({
    conflict,
    message: describeConflict(conflict, allocatedElsewhere.get(allocationIdentity(conflict)) ?? 0),
  }));
}

function rejectConflicts(res: Response, conflicts: Awaited<ReturnType<typeof checkAllocationCap>>) {
  res.status(400).json({
    success: false,
    message: conflicts.map(({ message }) => message).join('; '),
    conflicts: conflicts.map(({ conflict }) => conflict),
  });
}

function handleGoalError(res: Response, error: unknown, context: string) {
  if (error instanceof ZodError) {
    res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    return;
  }
  logger.error({ err: error }, context);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

export async function getGoals(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user?.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const goals = await database
      .getDb()
      .collection(GOALS_COLLECTION)
      .find({ userId: new ObjectId(user.userId) })
      .sort({ targetDate: 1 })
      .toArray();
    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    handleGoalError(res, error, 'Fetch goals error');
  }
}

export async function addGoal(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user?.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const userId = new ObjectId(user.userId);
    const parsed = goalInputSchema.parse(req.body);
    const conflicts = await checkAllocationCap(userId, parsed.allocations);
    if (conflicts.length > 0) {
      rejectConflicts(res, conflicts);
      return;
    }
    const now = new Date();
    const result = await database
      .getDb()
      .collection(GOALS_COLLECTION)
      .insertOne({ ...parsed, userId, createdAt: now, updatedAt: now });
    res.status(201).json({ success: true, message: 'Goal added', id: result.insertedId });
  } catch (error) {
    handleGoalError(res, error, 'Add goal error');
  }
}

export async function updateGoal(req: Request, res: Response) {
  const filter = resolveOwnedFilter(req, res, 'Goal');
  if (!filter) return;
  try {
    const parsed = goalInputSchema.parse(req.body);
    const conflicts = await checkAllocationCap(filter.userId, parsed.allocations, filter._id);
    if (conflicts.length > 0) {
      rejectConflicts(res, conflicts);
      return;
    }
    const absentFields = goalInputFieldNames.filter((field) => parsed[field] === undefined);
    const result = await database
      .getDb()
      .collection(GOALS_COLLECTION)
      .updateOne(filter, {
        $set: { ...parsed, updatedAt: new Date() },
        ...(absentFields.length > 0 && {
          $unset: Object.fromEntries(absentFields.map((field) => [field, ''])),
        }),
      });
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Goal not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Goal updated' });
  } catch (error) {
    handleGoalError(res, error, 'Update goal error');
  }
}

export const deleteGoal = deleteOwnedDocument({ collection: GOALS_COLLECTION, label: 'Goal' });
