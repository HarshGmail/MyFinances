import { Router } from 'express';
import { addRecurringDeposit, getRecurringDeposits } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

// POST /recurring-deposits/addDeposit - Add a new recurring deposit
router.post('/addDeposit', authenticateToken, addRecurringDeposit);

// GET /recurring-deposits/getDeposits - Fetch all recurring deposits for the authenticated user
router.get('/getDeposits', authenticateToken, getRecurringDeposits);

export default router;
