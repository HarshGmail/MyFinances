import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { ZodError, ZodTypeAny } from 'zod';
import database from '../database';
import { getUserFromRequest } from './jwtHelpers';
import logger from './logger';

interface OwnedDocumentOptions {
  collection: string;
  label: string;
}

export function resolveOwnedFilter(req: Request, res: Response, label: string) {
  const user = getUserFromRequest(req);
  if (!user?.userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: `Invalid ${label} ID` });
    return null;
  }
  return { _id: new ObjectId(id), userId: new ObjectId(user.userId) };
}

export function updateOwnedDocument(
  { collection, label }: OwnedDocumentOptions,
  schema: ZodTypeAny,
  toStored: (parsed: Record<string, unknown>) => Record<string, unknown> = (parsed) => parsed
) {
  return async (req: Request, res: Response) => {
    const filter = resolveOwnedFilter(req, res, label);
    if (!filter) return;
    try {
      const parsed = schema.parse(req.body) as Record<string, unknown>;
      const result = await database
        .getDb()
        .collection(collection)
        .updateOne(filter, { $set: toStored(parsed) });
      if (result.matchedCount === 0) {
        res.status(404).json({ success: false, message: `${label} not found` });
        return;
      }
      res.status(200).json({ success: true, message: `${label} updated` });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
        return;
      }
      logger.error({ err: error, collection }, 'Update owned document error');
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
}

export function deleteOwnedDocument({ collection, label }: OwnedDocumentOptions) {
  return async (req: Request, res: Response) => {
    const filter = resolveOwnedFilter(req, res, label);
    if (!filter) return;
    try {
      const result = await database.getDb().collection(collection).deleteOne(filter);
      if (result.deletedCount === 0) {
        res.status(404).json({ success: false, message: `${label} not found` });
        return;
      }
      res.status(200).json({ success: true, message: `${label} deleted` });
    } catch (error) {
      logger.error({ err: error, collection }, 'Delete owned document error');
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
}
