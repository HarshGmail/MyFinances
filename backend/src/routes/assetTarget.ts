import { Router } from 'express';
import {
  addAssetTarget,
  getAssetTargetById,
  getAssetTargetsByAssetId,
  getAssetTargetsByAsset,
  listUserAssetTargets,
  updateAssetTargetById,
  removeAssetTarget,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

router.use(authenticateToken);

router.post('/addAssetTarget', addAssetTarget);
router.get('/getAssetTargetById/:id', getAssetTargetById);
router.get('/getAssetTargetsByAssetId/:assetId', getAssetTargetsByAssetId);
router.get('/getAssetTargetsByAsset/:asset', getAssetTargetsByAsset);
router.put('/updateAssetTargetById/:id', updateAssetTargetById);
router.put('/removeAssetTarget/:id', removeAssetTarget);
router.get('/listUserAssetTargets', listUserAssetTargets);

export default router;
