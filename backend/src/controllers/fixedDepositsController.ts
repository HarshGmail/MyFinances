import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { fixedDepositSchema } from '../schemas/fixedDeposits';
import { getUserFromRequest } from '../utils/jwtHelpers';

export async function addFixedDeposit(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const parsed = fixedDepositSchema.omit({ userId: true, _id: true }).parse(req.body);
    const newFixedDeposit = {
      ...parsed,
      userId: new ObjectId(user.userId),
      dateOfCreation: new Date(parsed.dateOfCreation),
      dateOfMaturity: new Date(parsed.dateOfMaturity),
    };
    const db = database.getDb();
    const collection = db.collection('fixedDeposits');
    const result = await collection.insertOne(newFixedDeposit);
    res
      .status(201)
      .json({ success: true, message: 'new Fixed Deposit added', id: result.insertedId });
  } catch (error) {
    console.error('Add Fixed Deposit error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getFixedDeposits(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('fixedDeposits');
    const transactions = await collection.find({ userId: new ObjectId(user.userId) }).toArray();
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error('Fetch fixed deposits error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
