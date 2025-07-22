import { Router } from 'express';
import { addGoal, getGoals, updateGoal, deleteGoal } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

// POST /user-goals - Add a new goal
router.post('/add', authenticateToken, addGoal);

// GET /user-goals - Fetch all goals for the authenticated user
router.get('/', authenticateToken, getGoals);

// PUT /user-goals/:id - Update a goal by ID
router.put('/update/:id', authenticateToken, updateGoal);

// DELETE /user-goals/:id - Delete a goal by ID
router.delete('/delete/:id', authenticateToken, deleteGoal);

export default router;
