import { Router } from 'express';
import {
  addStockTransaction,
  getStockTransactions,
  getNSEQuote,
  searchStocksByName,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

// POST /stocks/transaction - Add a new stock transaction
router.post('/transaction', authenticateToken, addStockTransaction);

// GET /stocks/transactions - Fetch all stock transactions for the authenticated user
router.get('/transactions', authenticateToken, getStockTransactions);

// GET /stocks/search?stockName
router.get('/search', authenticateToken, searchStocksByName);

// GET /stocks/nse-quote?symbol=SYMBOL - Fetch NSE quote for a stock symbol
router.get('/nse-quote', authenticateToken, getNSEQuote);

export default router;
