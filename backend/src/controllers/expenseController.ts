import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { expenseSchema } from '../schemas/expense';
import { getUserFromRequest } from '../utils/jwtHelpers';

export async function addExpense(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const parsed = expenseSchema.omit({ userId: true, _id: true }).parse(req.body);

    const newExpense = {
      ...parsed,
      userId: new ObjectId(user.userId),
    };

    const db = database.getDb();
    const collection = db.collection('expenses');
    const result = await collection.insertOne(newExpense);

    res.status(201).json({ success: true, message: 'New expense added', id: result.insertedId });
  } catch (error) {
    console.error('Add expense error:', error);
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
    console.error('Fetch expenses error:', error);
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
    console.error('Fetch expense by ID error:', error);
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
      { $set: parsed }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Expense updated successfully' });
  } catch (error) {
    console.error('Update expense error:', error);
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
    console.error('Delete expense error:', error);
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
    console.error('Fetch expenses by tag error:', error);
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
    console.error('Fetch expenses by frequency error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
