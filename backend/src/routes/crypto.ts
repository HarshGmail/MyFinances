import { Router } from 'express';
import {
  addCryptoTransaction,
  getCryptoTransactions,
  fetchUserBalance,
  fetchMultipleCoinBalances,
  getCoinCandles,
  searchCryptoCoinsByName,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

// POST /crypto/transaction - Add a new crypto transaction
router.post('/transaction', authenticateToken, addCryptoTransaction);

// GET /crypto/transactions - Fetch all crypto transactions for the authenticated user
router.get('/transactions', authenticateToken, getCryptoTransactions);

router.get('/getUserCryptoBalance', authenticateToken, fetchUserBalance);

router.post('/getCoinPrices', authenticateToken, fetchMultipleCoinBalances);

// GET /crypto/candles - Public endpoint for coin candles
router.get('/candles', authenticateToken, getCoinCandles);

router.get('/search', authenticateToken, searchCryptoCoinsByName);
export default router;
