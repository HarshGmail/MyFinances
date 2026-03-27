import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { expenseSchema } from '../schemas';
import { getUserFromRequest } from '../utils/jwtHelpers';
import logger from '../utils/logger';

export async function addExpense(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const parsed = expenseSchema.omit({ userId: true, _id: true }).parse(req.body);

    const now = new Date();
    const newExpense = {
      ...parsed,
      userId: new ObjectId(user.userId),
      createdAt: now,
      updatedAt: now,
    };

    const db = database.getDb();
    const collection = db.collection('expenses');
    const result = await collection.insertOne(newExpense);

    res.status(201).json({ success: true, message: 'New expense added', id: result.insertedId });
  } catch (error) {
    logger.error({ err: error }, 'Add expense error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getExpenses(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const db = database.getDb();
    const collection = db.collection('expenses');
    const expenses = await collection.find({ userId: new ObjectId(user.userId) }).toArray();

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    logger.error({ err: error }, 'Fetch expenses error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getExpenseById(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid expense ID' });
      return;
    }

    const db = database.getDb();
    const collection = db.collection('expenses');

    const expense = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(user.userId),
    });

    if (!expense) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    logger.error({ err: error }, 'Fetch expense by ID error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateExpense(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid expense ID' });
      return;
    }

    const parsed = expenseSchema.omit({ userId: true, _id: true }).partial().parse(req.body);

    if (Object.keys(parsed).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields to update' });
      return;
    }

    const db = database.getDb();
    const collection = db.collection('expenses');

    const result = await collection.updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(user.userId) },
      { $set: { ...parsed, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Expense updated successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Update expense error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteExpense(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid expense ID' });
      return;
    }

    const db = database.getDb();
    const collection = db.collection('expenses');

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(user.userId),
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Delete expense error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getExpensesByTag(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { tag } = req.params;

    const db = database.getDb();
    const collection = db.collection('expenses');

    const expenses = await collection
      .find({
        userId: new ObjectId(user.userId),
        tag: tag,
      })
      .toArray();

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    logger.error({ err: error }, 'Fetch expenses by tag error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getMonthlyInvestmentSummary(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const months = Math.min(parseInt(req.query.months as string) || 12, 24);
    const userId = new ObjectId(user.userId);
    const db = database.getDb();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Fetch all investment transactions in parallel
    const [stocks, gold, crypto, mf, rd] = await Promise.all([
      db
        .collection('stocks')
        .find({ userId, date: { $gte: startDate, $lte: endDate } })
        .toArray(),
      db
        .collection('digitalGold')
        .find({ userId, date: { $gte: startDate, $lte: endDate } })
        .toArray(),
      db
        .collection('crypto')
        .find({ userId, date: { $gte: startDate, $lte: endDate } })
        .toArray(),
      db
        .collection('mutualFunds')
        .find({ userId, date: { $gte: startDate, $lte: endDate } })
        .toArray(),
      db
        .collection('recurringDeposits')
        .find({ userId, dateOfCreation: { $gte: startDate, $lte: endDate } })
        .toArray(),
    ]);

    // Initialize monthly buckets for the full range
    type InvestmentBucket = {
      stocks: number;
      gold: number;
      crypto: number;
      mutualFunds: number;
      rd: number;
    };
    const monthlyMap: Record<string, InvestmentBucket> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(endDate);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = { stocks: 0, gold: 0, crypto: 0, mutualFunds: 0, rd: 0 };
    }

    const addToMonth = (date: Date, bucket: keyof InvestmentBucket, amount: number) => {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) monthlyMap[key][bucket] += amount;
    };

    for (const tx of stocks) {
      if (tx.type === 'debit') continue;
      addToMonth(new Date(tx.date), 'stocks', tx.amount || 0);
    }
    for (const tx of gold) {
      if (tx.type === 'debit') continue;
      addToMonth(new Date(tx.date), 'gold', tx.amount || 0);
    }
    for (const tx of crypto) {
      if (tx.type === 'debit') continue;
      addToMonth(new Date(tx.date), 'crypto', tx.amount || 0);
    }
    for (const tx of mf) {
      if (tx.type === 'debit') continue;
      addToMonth(new Date(tx.date), 'mutualFunds', tx.amount || 0);
    }
    for (const rdItem of rd) {
      addToMonth(new Date(rdItem.dateOfCreation), 'rd', rdItem.monthlyDeposit || 0);
    }

    const result = Object.entries(monthlyMap)
      .map(([monthKey, investments]) => ({
        monthKey,
        investments,
        total: Object.values(investments).reduce((s, v) => s + v, 0),
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error({ err: error }, 'Monthly investment summary error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getExpensesByFrequency(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { frequency } = req.params;

    const db = database.getDb();
    const collection = db.collection('expenses');

    const expenses = await collection
      .find({
        userId: new ObjectId(user.userId),
        expenseFrequency: frequency,
      })
      .toArray();

    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    logger.error({ err: error }, 'Fetch expenses by frequency error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteAllUserExpenses(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const result = await db
      .collection('expenses')
      .deleteMany({ userId: new ObjectId(user.userId) });
    res.status(200).json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    logger.error({ err: error }, 'Delete all expenses error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
