import { Router } from 'express';
import { getIndiaInflation } from '../controllers/inflationsController';
import { authenticateToken } from '../middleware';

const router = Router();

// GET /api/inflation?numOfYears=5
router.get('/', authenticateToken, getIndiaInflation);

export default router;
