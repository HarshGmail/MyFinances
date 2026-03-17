import { Router } from 'express';
import {
  addExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesByTag,
  getExpensesByFrequency,
  getMonthlyInvestmentSummary,
} from '../controllers/expenseController';
import { authenticateToken } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Specific named routes MUST come before /:id to avoid being swallowed
router.get('/monthly-investment-summary', getMonthlyInvestmentSummary);
router.get('/tag/:tag', getExpensesByTag);
router.get('/frequency/:frequency', getExpensesByFrequency);

// Core CRUD operations
router.post('/', addExpense);
router.get('/', getExpenses);
router.get('/:id', getExpenseById);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
