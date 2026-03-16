import { Router } from 'express';
import { ingestUpiTransaction } from '../controllers/ingestController';

const router = Router();

// No JWT — authenticated via per-user ingest token in request body
router.post('/upi', ingestUpiTransaction);

export default router;
