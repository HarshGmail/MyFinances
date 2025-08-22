import { Router } from 'express';
import {
  addStockTransaction,
  getStockTransactions,
  getNSEQuote,
  searchStocksByName,
  getFullStockProfile,
  updateStockTransaction,
  deleteStockTransaction,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

// POST /stocks/transaction - Add a new stock transaction
router.post('/transaction', addStockTransaction);

router.put('/transaction/:id', updateStockTransaction);

// GET /stocks/transactions - Fetch all stock transactions for the authenticated user
router.get('/transactions', getStockTransactions);

// GET /stocks/search?stockName
router.get('/search', searchStocksByName);

// GET /stocks/nse-quote?symbol=SYMBOL - Fetch NSE quote for a stock symbol
router.get('/nse-quote', getNSEQuote);

// GET /stocks/stock-profile?symbol=SYMBOL&range=time period&interval=time interval
router.get('/stock-profile', getFullStockProfile);

router.delete('/transaction/:id', deleteStockTransaction);
export default router;
