import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { expenseTransactionSchema } from '../schemas/expenseTransaction';
import { getUserFromRequest } from '../utils/jwtHelpers';

export async function addExpenseTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const body = {
      ...req.body,
      date: new Date(req.body.date),
    };

    const parsed = expenseTransactionSchema.omit({ userId: true, _id: true }).parse(body);

    const now = new Date();
    const newEntry = {
      ...parsed,
      userId: new ObjectId(user.userId),
      createdAt: now,
      updatedAt: now,
    };

    const db = database.getDb();
    const result = await db.collection('expenseTransactions').insertOne(newEntry);

    res
      .status(201)
      .json({ success: true, message: 'Expense transaction added', id: result.insertedId });
  } catch (error) {
    console.error('Add expense transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getExpenseTransactions(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { startDate, endDate } = req.query;
    const filter: Record<string, unknown> = { userId: new ObjectId(user.userId) };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as Record<string, Date>).$gte = new Date(startDate as string);
      if (endDate) (filter.date as Record<string, Date>).$lte = new Date(endDate as string);
    }

    const db = database.getDb();
    const transactions = await db
      .collection('expenseTransactions')
      .find(filter)
      .sort({ date: -1 })
      .toArray();

    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error('Get expense transactions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateExpenseTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid transaction ID' });
      return;
    }

    const body = req.body.date ? { ...req.body, date: new Date(req.body.date) } : req.body;
    const parsed = expenseTransactionSchema.omit({ userId: true, _id: true }).partial().parse(body);

    if (Object.keys(parsed).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields to update' });
      return;
    }

    const db = database.getDb();
    const result = await db
      .collection('expenseTransactions')
      .updateOne(
        { _id: new ObjectId(id), userId: new ObjectId(user.userId) },
        { $set: { ...parsed, updatedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Transaction updated successfully' });
  } catch (error) {
    console.error('Update expense transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteExpenseTransaction(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid transaction ID' });
      return;
    }

    const db = database.getDb();
    const result = await db.collection('expenseTransactions').deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(user.userId),
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete expense transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getExpenseTransactionNames(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const db = database.getDb();
    const names = await db
      .collection('expenseTransactions')
      .distinct('name', { userId: new ObjectId(user.userId) });

    res.status(200).json({ success: true, data: names });
  } catch (error) {
    console.error('Get expense transaction names error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
