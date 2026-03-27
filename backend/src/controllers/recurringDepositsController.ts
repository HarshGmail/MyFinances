import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { recurringDepositSchema } from '../schemas/recurringDeposits';
import { getUserFromRequest } from '../utils/jwtHelpers';
import logger from '../utils/logger';

export async function addRecurringDeposit(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const parsed = recurringDepositSchema.omit({ userId: true, _id: true }).parse(req.body);
    const newRecurringDeposit = {
      ...parsed,
      userId: new ObjectId(user.userId),
      dateOfCreation: new Date(parsed.dateOfCreation),
      dateOfMaturity: new Date(parsed.dateOfMaturity),
    };
    const db = database.getDb();
    const collection = db.collection('recurringDeposits');
    const result = await collection.insertOne(newRecurringDeposit);
    res
      .status(201)
      .json({ success: true, message: 'new recurring Deposit added', id: result.insertedId });
  } catch (error) {
    logger.error({ err: error }, 'Add recurring Deposit error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getRecurringDeposits(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('recurringDeposits');
    const transactions = await collection.find({ userId: new ObjectId(user.userId) }).toArray();
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    logger.error({ err: error }, 'Fetch recurring deposits error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteAllUserRecurringDeposits(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const result = await db
      .collection('recurringDeposits')
      .deleteMany({ userId: new ObjectId(user.userId) });
    res.status(200).json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    logger.error({ err: error }, 'Delete all recurring deposits error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
