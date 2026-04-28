import { Router } from 'express';
import {
  signup,
  login,
  logout,
  userProfile,
  updateUserProfile,
  regenerateIngestToken,
  ingestTokenExchange,
  updateIngestSenderEmail,
  changePassword,
  forgotPassword,
  resetPassword,
  demoLogin,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/demo-login', demoLogin);
router.post('/logout', logout);
router.get('/profile', authenticateToken, userProfile);
router.put('/profile', authenticateToken, updateUserProfile);
router.post('/ingest-token/regenerate', authenticateToken, regenerateIngestToken);
router.post('/ingest-token/exchange', ingestTokenExchange);
router.put('/ingest-sender-email', authenticateToken, updateIngestSenderEmail);
router.post('/change-password', authenticateToken, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
