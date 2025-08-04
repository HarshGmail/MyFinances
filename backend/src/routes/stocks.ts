import { Router } from 'express';
import {
  addStockTransaction,
  getStockTransactions,
  getNSEQuote,
  searchStocksByName,
  getFullStockProfile,
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

// GET /stocks/stock-profile?symbol=SYMBOL&range=time period&interval=time interval
router.get('/stock-profile', authenticateToken, getFullStockProfile);

export default router;
