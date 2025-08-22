import { Router } from 'express';
import { addRecurringDeposit, getRecurringDeposits } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

// POST /recurring-deposits/addDeposit - Add a new recurring deposit
router.post('/addDeposit', addRecurringDeposit);

// GET /recurring-deposits/getDeposits - Fetch all recurring deposits for the authenticated user
router.get('/getDeposits', getRecurringDeposits);

export default router;
