import { Router } from 'express';
import {
  addStockTransaction,
  getStockTransactions,
  getNSEQuote,
  searchStocksByName,
  getFullStockProfile,
  getStockFinancials,
  updateStockTransaction,
  deleteStockTransaction,
  deleteAllUserStockTransactions,
  getStocksPortfolio,
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

// GET /stocks/financials?symbol=SYMBOL - quoteSummary metrics (P/E, margins, etc.)
router.get('/financials', getStockFinancials);

// GET /stocks/portfolio - Grouped portfolio with live prices, summary and raw transactions
router.get('/portfolio', getStocksPortfolio);

router.delete('/transaction/:id', deleteStockTransaction);
router.delete('/all', deleteAllUserStockTransactions);
export default router;
