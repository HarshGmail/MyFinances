import { Router } from 'express';
import {
  addGoldTransaction,
  deleteGoldTransaction,
  getGoldTransactions,
  getSafeGoldRates,
  updateGoldTransaction,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

// POST /gold/transaction - Add a new digital gold transaction
router.post('/transaction', addGoldTransaction);

// GET /gold/transactions - Fetch all digital gold transactions for the authenticated user
router.get('/transactions', getGoldTransactions);

// GET /gold/safe-gold-rates - Public endpoint for SafeGold rates
router.get('/safe-gold-rates', getSafeGoldRates);

router.put('/transaction/:id', updateGoldTransaction);
router.delete('/transaction/:id', deleteGoldTransaction);

export default router;
