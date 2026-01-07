import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import {
  assetTargetSchema,
  assetTargetInputSchema,
  AssetTargetInput,
  createAssetTarget,
} from '../schemas';
import { getUserFromRequest } from '../utils/jwtHelpers';

function parseObjectId(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function addAssetTarget(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    let payload: AssetTargetInput;
    try {
      payload = assetTargetInputSchema.parse(req.body);
    } catch (err: unknown) {
      const error = err as Error;
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.message,
      });
      return;
    }

    const db = database.getDb();
    const col = db.collection('assetTargets');

    const docToInsert = {
      ...createAssetTarget(payload),
      userId: new ObjectId(userPayload.userId),
    };

    const result = await col.insertOne(docToInsert);

    res.status(201).json({
      success: true,
      message: 'Asset target created',
      data: {
        id: result.insertedId.toString(),
        ...payload,
      },
    });
  } catch (err: unknown) {
    console.error('addAssetTarget error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getAssetTargetById(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const id = req.params.id;
    const oid = parseObjectId(id);
    if (!oid) {
      res.status(400).json({ success: false, message: 'Invalid id' });
      return;
    }

    const db = database.getDb();
    const col = db.collection('assetTargets');

    const doc = await col.findOne({ _id: oid, userId: new ObjectId(userPayload.userId) });
    if (!doc) {
      res.status(404).json({ success: false, message: 'Asset target not found' });
      return;
    }

    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    console.error('getAssetTargetById error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Get asset targets by assetId (e.g., the underlying asset document id) for the authenticated user
 */
export async function getAssetTargetsByAssetId(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const assetIdStr = req.params.assetId;
    const assetOid = parseObjectId(assetIdStr);
    if (!assetOid) {
      res.status(400).json({ success: false, message: 'Invalid assetId' });
      return;
    }

    const db = database.getDb();
    const col = db.collection('assetTargets');

    const cursor = col.find({
      assetId: assetOid,
      userId: new ObjectId(userPayload.userId),
    });

    const results = await cursor.toArray();

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('getAssetTargetsByAssetId error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Get asset targets by asset type (stock, crypto, etc.) for the authenticated user
 * Query param: asset (string) or route param depending on your routing. Using route param here.
 */
export async function getAssetTargetsByAsset(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const assetType = req.params.asset;
    if (!assetType || typeof assetType !== 'string') {
      res.status(400).json({ success: false, message: 'asset param is required' });
      return;
    }

    try {
      assetTargetSchema.shape.asset.parse(assetType);
    } catch (err: unknown) {
      const error = err as Error;
      res.status(400).json({
        success: false,
        message: 'Invalid asset type',
        errors: error.message,
      });
      return;
    }

    const db = database.getDb();
    const col = db.collection('assetTargets');

    const cursor = col.find({
      asset: assetType,
      userId: new ObjectId(userPayload.userId),
    });

    const results = await cursor.toArray();

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('getAssetTargetsByAsset error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Fetch all asset targets for the authenticated user.
 */
export async function listUserAssetTargets(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = database.getDb();
    const col = db.collection('assetTargets');

    const cursor = col.find({ userId: new ObjectId(userPayload.userId) }).sort({ createdAt: -1 });
    const results = await cursor.toArray();

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('listUserAssetTargets error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateAssetTargetById(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const id = req.params.id;
    const oid = parseObjectId(id);
    if (!oid) {
      res.status(400).json({ success: false, message: 'Invalid id' });
      return;
    }

    // Validate update payload (partial)
    let updates: Partial<AssetTargetInput>;
    try {
      updates = assetTargetInputSchema.partial().parse(req.body);
    } catch (err: unknown) {
      const error = err as Error;
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.message,
      });
      return;
    }

    const db = database.getDb();
    const col = db.collection('assetTargets');

    // Ensure the document belongs to the user before updating
    const existing = await col.findOne({ _id: oid, userId: new ObjectId(userPayload.userId) });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Asset target not found' });
      return;
    }

    const updateOps: unknown = { $set: updates, $currentDate: { updatedAt: true } };

    await col.updateOne({ _id: oid }, updateOps as Document[]);

    const updatedDoc = await col.findOne({ _id: oid });
    res.status(200).json({ success: true, message: 'Asset target updated', data: updatedDoc });
  } catch (err) {
    console.error('updateAssetTargetById error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function removeAssetTarget(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const id = req.params.id;
    const oid = parseObjectId(id);
    if (!oid) {
      res.status(400).json({ success: false, message: 'Invalid id' });
      return;
    }

    const db = database.getDb();
    const col = db.collection('assetTargets');

    const deleteResult = await col.deleteOne({
      _id: oid,
      userId: new ObjectId(userPayload.userId),
    });

    if (deleteResult.deletedCount === 0) {
      res
        .status(404)
        .json({ success: false, message: 'Asset target not found or not owned by user' });
      return;
    }

    res.status(200).json({ success: true, message: 'Asset target removed' });
  } catch (err) {
    console.error('removeAssetTarget error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
