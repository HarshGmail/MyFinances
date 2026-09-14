import { Router } from 'express';
import { getPushConfig, subscribeToPush, unsubscribeFromPush } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

router.get('/config', getPushConfig);
router.post('/subscribe', subscribeToPush);
router.delete('/subscribe', unsubscribeFromPush);

export default router;
