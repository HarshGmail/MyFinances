import { Router } from 'express';
import { addGoal, getGoals, updateGoal, deleteGoal } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

// POST /user-goals - Add a new goal
router.post('/add', addGoal);

// GET /user-goals - Fetch all goals for the authenticated user
router.get('/', getGoals);

// PUT /user-goals/:id - Update a goal by ID
router.put('/update/:id', updateGoal);

// DELETE /user-goals/:id - Delete a goal by ID
router.delete('/delete/:id', deleteGoal);

export default router;
