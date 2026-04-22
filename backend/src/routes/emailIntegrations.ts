import { Router } from 'express';
import {
  oauthConnect,
  oauthCallback,
  getStatus,
  disconnect,
  resetSync,
  updateSettings,
  syncEmails,
  getSyncJobStatus,
  cancelSync,
  importTransactions,
  wakePdfParser,
} from '../controllers/emailIntegrationsController';
import { authenticateToken } from '../middleware';

const router = Router();

router.get('/oauth/connect', authenticateToken, oauthConnect);
router.get('/oauth/callback', oauthCallback); // public — Google redirects here
router.get('/status', authenticateToken, getStatus);
router.get('/wake', authenticateToken, wakePdfParser);
router.delete('/disconnect', authenticateToken, disconnect);
router.post('/reset-sync', authenticateToken, resetSync);
router.put('/settings', authenticateToken, updateSettings);
router.post('/sync', authenticateToken, syncEmails);
router.get('/sync-status/:jobId', authenticateToken, getSyncJobStatus);
router.post('/sync/:jobId/cancel', authenticateToken, cancelSync);
router.post('/import', authenticateToken, importTransactions);

export default router;
