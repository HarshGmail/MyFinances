import { Router } from 'express';
import cors from 'cors';
import {
  getExpenseTransactions,
  addExpenseTransaction,
  getRecurringExpenses,
  getStockTransactions,
  getPortfolioSummary,
  addStockTransaction,
  getGoals,
  getToolDefinitions,
} from '../controllers/chatgptController';

const router = Router();

// Allow requests from any origin — ChatGPT calls these from OpenAI's servers
router.use(cors({ origin: '*' }));

// Tool definitions for OpenAI Actions schema
router.get('/tools', getToolDefinitions);

// Expense tools
router.get('/expenses/transactions', getExpenseTransactions);
router.post('/expenses/transactions', addExpenseTransaction);
router.get('/expenses/recurring', getRecurringExpenses);

// Stock tools
router.get('/stocks/transactions', getStockTransactions);
router.get('/stocks/portfolio', getPortfolioSummary);
router.post('/stocks/transactions', addStockTransaction);

// Goals
router.get('/goals', getGoals);

export default router;
