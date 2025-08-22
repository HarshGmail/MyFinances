import { Router } from 'express';
import {
  addCryptoTransaction,
  getCryptoTransactions,
  fetchUserBalance,
  fetchMultipleCoinBalances,
  getCoinCandles,
  searchCryptoCoinsByName,
  getMultipleCoinCandles,
  updateCryptoTransaction,
  deleteCryptoTransaction,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

// POST /crypto/transaction - Add a new crypto transaction
router.post('/transaction', addCryptoTransaction);

router.put('/transaction/:id', updateCryptoTransaction);
// GET /crypto/transactions - Fetch all crypto transactions for the authenticated user
router.get('/transactions', getCryptoTransactions);

router.get('/getUserCryptoBalance', fetchUserBalance);

router.post('/getCoinPrices', fetchMultipleCoinBalances);

// GET /crypto/candles - Public endpoint for coin candles
router.get('/candles', getCoinCandles);
router.get('/multipleCoinCandles', getMultipleCoinCandles);

router.get('/search', searchCryptoCoinsByName);

router.delete('/transaction/:id', deleteCryptoTransaction);

export default router;
