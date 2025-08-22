import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { digitalGoldSchema } from '../schemas/digitalGold';
import { getUserFromRequest } from '../utils/jwtHelpers';
import axios from 'axios';

export async function addGoldTransaction(req: Request, res: Response) {
  try {
    // Get user from cookie
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    // Validate and parse request body (excluding userId)
    const parsed = digitalGoldSchema.omit({ userId: true, _id: true }).parse(req.body);
    // Prepare transaction document
    const transaction = {
      ...parsed,
      userId: new ObjectId(user.userId),
      date: new Date(parsed.date),
    };
    // Insert into database
    const db = database.getDb();
    const collection = db.collection('digitalGold');
    const result = await collection.insertOne(transaction);
    res.status(201).json({ success: true, message: 'Transaction added', id: result.insertedId });
  } catch (error) {
    console.error('Add gold transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getGoldTransactions(req: Request, res: Response) {
  try {
    // Get user from cookie
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('digitalGold');
    const transactions = await collection.find({ userId: new ObjectId(user.userId) }).toArray();
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error('Fetch gold transactions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateGoldTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'Transaction ID is required' });
      return;
    }

    // Validate payload (omit _id and userId)
    const parsed = digitalGoldSchema.omit({ _id: true, userId: true }).parse(req.body);

    const db = database.getDb();
    const collection = db.collection('digitalGold');
    const result = await collection.updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(user.userId) },
      {
        $set: {
          ...parsed,
          date: new Date(parsed.date),
        },
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Transaction updated' });
  } catch (error) {
    console.error('Update gold transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteGoldTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: 'Transaction ID is required' });
      return;
    }

    const db = database.getDb();
    const collection = db.collection('digitalGold');
    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(user.userId),
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete gold transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getSafeGoldRates(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
      res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      return;
    }
    const url = `https://www.safegold.com/user-trends/gold-rates?start_date=${startDate}&end_date=${endDate}&frequency=d`;
    const response = await axios.get(url);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error fetching SafeGold rates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch SafeGold rates' });
  }
}
