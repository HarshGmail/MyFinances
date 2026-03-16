import { Router } from 'express';
import {
  addExpenseTransaction,
  getExpenseTransactions,
  updateExpenseTransaction,
  deleteExpenseTransaction,
  getExpenseTransactionNames,
} from '../controllers/expenseTransactionController';
import { authenticateToken } from '../middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', addExpenseTransaction);
router.get('/', getExpenseTransactions);
router.get('/names', getExpenseTransactionNames);
router.put('/:id', updateExpenseTransaction);
router.delete('/:id', deleteExpenseTransaction);

export default router;
