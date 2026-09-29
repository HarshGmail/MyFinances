import { Router } from 'express';
import {
  addRecurringDeposit,
  getRecurringDeposits,
  deleteAllUserRecurringDeposits,
  updateRecurringDeposit,
  deleteRecurringDeposit,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

// POST /recurring-deposits/addDeposit - Add a new recurring deposit
router.post('/addDeposit', addRecurringDeposit);

// GET /recurring-deposits/getDeposits - Fetch all recurring deposits for the authenticated user
router.get('/getDeposits', getRecurringDeposits);
router.delete('/all', deleteAllUserRecurringDeposits);
router.put('/:id', updateRecurringDeposit);
router.delete('/:id', deleteRecurringDeposit);

export default router;
