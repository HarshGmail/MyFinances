import { Router } from 'express';
import { handleResendEmailWebhook } from '../controllers/webhookController';

const router = Router();

// No authentication — Resend verifies via signature header
router.post('/email-received', handleResendEmailWebhook);

export default router;
