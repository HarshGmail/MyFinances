import { Router } from 'express';
import {
  addExpenseTransaction,
  getExpenseTransactions,
  updateExpenseTransaction,
  deleteExpenseTransaction,
  deleteAllUserExpenseTransactions,
  getExpenseTransactionNames,
  syncUpiEmailsEndpoint,
} from '../controllers/expenseTransactionController';
import { authenticateToken } from '../middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', addExpenseTransaction);
router.get('/', getExpenseTransactions);
router.get('/names', getExpenseTransactionNames);
router.get('/sync/upi-emails', syncUpiEmailsEndpoint);
router.put('/:id', updateExpenseTransaction);
router.delete('/all', deleteAllUserExpenseTransactions);
router.delete('/:id', deleteExpenseTransaction);

export default router;
