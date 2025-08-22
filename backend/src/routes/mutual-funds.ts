import { Router } from 'express';
import { addMutualFundTransaction, getMutualFundTransactions } from '../controllers';
import { authenticateToken } from '../middleware';
import { searchMutualFundsByName } from '../controllers/mutualFundsInfoController';

const router = Router();
router.use(authenticateToken);

// POST /mutual-funds/transaction - Add a new mutual fund transaction
router.post('/transaction', addMutualFundTransaction);

// GET /mutual-funds/transactions - Fetch all mutual fund transactions for the authenticated user
router.get('/transactions', getMutualFundTransactions);

// GET /mutual-funds/search - Search mutual funds by name
router.get('/search', searchMutualFundsByName);

export default router;
