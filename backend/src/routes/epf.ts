import { Router } from 'express';
import { addEpfAccount, getEpfAccounts, getEpfTimeline } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

router.post('/addInfo', addEpfAccount);
router.get('/timeline', getEpfTimeline);
router.get('/getInfo', getEpfAccounts);

export default router;
