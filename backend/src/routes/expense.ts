import { Router } from 'express';
import {
  addExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesByTag,
  getExpensesByFrequency,
} from '../controllers/expenseController';
import { authenticateToken } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Core CRUD operations
router.post('/', addExpense);
router.get('/', getExpenses);
router.get('/:id', getExpenseById);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

// Filter routes
router.get('/tag/:tag', getExpensesByTag);
router.get('/frequency/:frequency', getExpensesByFrequency);

export default router;
