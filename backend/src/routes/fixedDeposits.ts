import { Router } from 'express';
import { addFixedDeposit, getFixedDeposits } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

// POST /fixed-deposits/addDeposit - Add a new fixed Deposit
router.post('/addDeposit', addFixedDeposit);

// GET /fixed-deposits/getDeposits - Fetch all fixed Deposits for the authenticated user
router.get('/getDeposits', getFixedDeposits);

export default router;
