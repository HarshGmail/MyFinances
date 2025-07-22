import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import database from '../database';
import { userGoalSchema } from '../schemas/userGoals';
import { getUserFromRequest } from '../utils/jwtHelpers';

// Add a new goal
export async function addGoal(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (req.body.mutualFundIds) {
      req.body.mutualFundIds = req.body.mutualFundIds.map((id: string) => new ObjectId(id));
    }
    const parsed = userGoalSchema.omit({ userId: true, _id: true }).parse(req.body);
    const goal = {
      ...parsed,
      userId: new ObjectId(user.userId),
    };
    const db = database.getDb();
    const collection = db.collection('userGoals');
    const result = await collection.insertOne(goal);
    res.status(201).json({ success: true, message: 'Goal added', id: result.insertedId });
  } catch (error) {
    console.error('Add goal error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get all goals for the authenticated user
export async function getGoals(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('userGoals');
    const goals = await collection.find({ userId: new ObjectId(user.userId) }).toArray();
    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    console.error('Fetch goals error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Update a goal by ID
export async function updateGoal(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid goal ID' });
      return;
    }
    const parsed = userGoalSchema.omit({ userId: true, _id: true }).partial().parse(req.body);
    const db = database.getDb();
    const collection = db.collection('userGoals');
    const result = await collection.updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(user.userId) },
      { $set: parsed }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Goal not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Goal updated' });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Delete a goal by ID
export async function deleteGoal(req: Request, res: Response) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !user.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid goal ID' });
      return;
    }
    const db = database.getDb();
    const collection = db.collection('userGoals');
    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(user.userId),
    });
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Goal not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
