import { Router } from 'express';
import { addFixedDeposit, getFixedDeposits } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

// POST /fixed-deposits/addDeposit - Add a new fixed Deposit
router.post('/addDeposit', authenticateToken, addFixedDeposit);

// GET /fixed-deposits/getDeposits - Fetch all fixed Deposits for the authenticated user
router.get('/getDeposits', authenticateToken, getFixedDeposits);

export default router;
