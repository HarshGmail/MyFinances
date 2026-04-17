import express, { Router } from 'express';
import {
  addEpfAccount,
  getEpfAccounts,
  getEpfTimeline,
  deleteAllUserEpfAccounts,
  parseEpfPassbooks,
  bulkUpdateEpfAccounts,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

router.post('/addInfo', addEpfAccount);
router.get('/timeline', getEpfTimeline);
router.get('/getInfo', getEpfAccounts);
router.delete('/all', deleteAllUserEpfAccounts);
// Allow large base64-encoded PDF payloads on these routes
router.post('/parse-passbook', express.json({ limit: '20mb' }), parseEpfPassbooks);
router.post('/bulk-update', bulkUpdateEpfAccounts);

export default router;
