import { Router } from 'express';
import { addEpfAccount, getEpfAccounts, getEpfTimeline } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

router.post('/addInfo', authenticateToken, addEpfAccount);
router.get('/timeline', authenticateToken, getEpfTimeline);
router.get('/getInfo', authenticateToken, getEpfAccounts);

export default router;
