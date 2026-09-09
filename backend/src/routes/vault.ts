import { Router } from 'express';
import {
  getVaultMeta,
  initVault,
  unlockVault,
  confirmVaultUnlock,
  getVaultItems,
  upsertVaultItem,
  deleteVaultItem,
  rekeyVault,
  destroyVault,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

router.get('/meta', getVaultMeta);
router.post('/init', initVault);
router.post('/unlock', unlockVault);
router.post('/unlock/confirm', confirmVaultUnlock);
router.get('/items', getVaultItems);
router.put('/items/:itemId', upsertVaultItem);
router.delete('/items/:itemId', deleteVaultItem);
router.post('/rekey', rekeyVault);
router.delete('/', destroyVault);

export default router;
