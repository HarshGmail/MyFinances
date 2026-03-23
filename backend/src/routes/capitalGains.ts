import { Router } from 'express';
import { getCapitalGains } from '../controllers/capitalGainsController';
import { authenticateToken } from '../middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', getCapitalGains);

export default router;
