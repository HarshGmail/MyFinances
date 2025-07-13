import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { mutualFundSchema } from '../schemas/mutual-funds';
import { getUserFromRequest } from '../utils/jwtHelpers';

export async function addMutualFundTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const parsed = mutualFundSchema.omit({ userId: true, _id: true }).parse(req.body);
    const transaction = {
      ...parsed,
      userId: new ObjectId(user.userId),
      date: new Date(parsed.date),
    };
    const db = database.getDb();
    const collection = db.collection('mutualFunds');
    const result = await collection.insertOne(transaction);
    res.status(201).json({ success: true, message: 'Transaction added', id: result.insertedId });
  } catch (error) {
    console.error('Add mutual fund transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getMutualFundTransactions(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('mutualFunds');
    const transactions = await collection.find({ userId: new ObjectId(user.userId) }).toArray();
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error('Fetch mutual fund transactions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
