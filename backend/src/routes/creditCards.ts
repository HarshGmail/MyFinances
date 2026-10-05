import { Router } from 'express';
import {
  addCreditCard,
  deleteCreditCard,
  getCardAlerts,
  getCardSenderSuggestions,
  getCardStatements,
  getCardTransactions,
  getCreditCards,
  resetCardSync,
  syncCreditCards,
  updateCreditCard,
} from '../controllers/creditCardsController';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', getCreditCards);
router.post('/', addCreditCard);
router.get('/statements', getCardStatements);
router.get('/transactions', getCardTransactions);
router.get('/alerts', getCardAlerts);
router.get('/sender-suggestions', getCardSenderSuggestions);
router.post('/sync', syncCreditCards);
router.put('/:id', updateCreditCard);
router.delete('/:id', deleteCreditCard);
router.post('/:id/reset-sync', resetCardSync);

export default router;
