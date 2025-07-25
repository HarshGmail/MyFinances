import { Router } from 'express';
import { addMutualFundInfo, getMutualFundInfo, getMfapiNavHistory } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

// POST /mutual-funds/Info - Add a new mutual fund Info
router.post('/infoAddition', authenticateToken, addMutualFundInfo);

// GET /mutual-funds/Infos - Fetch all mutual fund Infos for the authenticated user
router.get('/infoFetch', authenticateToken, getMutualFundInfo);

// POST /mutual-funds-info/nav-history - Fetch NAV history for multiple scheme numbers
router.post('/nav-history', authenticateToken, getMfapiNavHistory);

export default router;
