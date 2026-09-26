import { Router } from 'express';
import {
  getPushConfig,
  registerExpoPushToken,
  subscribeToPush,
  unregisterExpoPushToken,
  unsubscribeFromPush,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

router.get('/config', getPushConfig);
router.post('/subscribe', subscribeToPush);
router.delete('/subscribe', unsubscribeFromPush);
router.post('/expo-token', registerExpoPushToken);
router.delete('/expo-token', unregisterExpoPushToken);

export default router;
