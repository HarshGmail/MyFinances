import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Zod schema for validation (timestamps optional so DB can set them)
export const assetTargetSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.instanceof(ObjectId),
  asset: z.enum(['stock', 'crypto', 'mutual-fund', 'gold']),
  targetPrice: z.number(),
  assetId: z.instanceof(ObjectId).optional(),
  assetName: z.string(),
  targetDescription: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// TypeScript type
export type AssetTarget = z.infer<typeof assetTargetSchema>;

// Input schema (omit id and timestamps so DB can populate them)
export const assetTargetInputSchema = assetTargetSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});

export type AssetTargetInput = z.infer<typeof assetTargetInputSchema>;

/**
 * Prepare an asset target payload for insertion.
 * Note: does NOT set createdAt/updatedAt — MongoDB should set them.
 */
export function createAssetTarget(data: AssetTargetInput): AssetTargetInput {
  const parsed = assetTargetInputSchema.parse(data);
  return parsed;
}

/**
 * Prepare an updated asset target object for saving.
 * Note: does NOT touch updatedAt — let MongoDB set/update it (e.g. via $currentDate or DB trigger).
 */
export function updateAssetTarget(
  existing: AssetTarget,
  updates: Partial<AssetTargetInput>
): AssetTarget {
  const parsedUpdates = assetTargetInputSchema.partial().parse(updates);
  return {
    ...existing,
    ...parsedUpdates,
  };
}
