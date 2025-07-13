import { Router } from 'express';
import { addGoldTransaction, getGoldTransactions, getSafeGoldRates } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

// POST /gold/transaction - Add a new digital gold transaction
router.post('/transaction', authenticateToken, addGoldTransaction);

// GET /gold/transactions - Fetch all digital gold transactions for the authenticated user
router.get('/transactions', authenticateToken, getGoldTransactions);

// GET /gold/safe-gold-rates - Public endpoint for SafeGold rates
router.get('/safe-gold-rates', getSafeGoldRates);

export default router;
