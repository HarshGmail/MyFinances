import { Router } from 'express';
import {
  getWallets,
  createWallet,
  renameWallet,
  deleteWallet,
  getWalletItems,
  addWalletItem,
  deleteWalletItem,
  getWalletMembers,
  approveWalletMember,
  removeWalletMember,
  rotateWalletKey,
  createWalletInvite,
  revokeWalletInvite,
  getWalletInviteInfo,
  joinWallet,
} from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', getWallets);
router.post('/', createWallet);
router.get('/join/:token', getWalletInviteInfo);
router.post('/join/:token', joinWallet);
router.patch('/:walletId', renameWallet);
router.delete('/:walletId', deleteWallet);
router.get('/:walletId/items', getWalletItems);
router.put('/:walletId/items/:itemId', addWalletItem);
router.delete('/:walletId/items/:itemId', deleteWalletItem);
router.get('/:walletId/members', getWalletMembers);
router.post('/:walletId/members/:userId/approve', approveWalletMember);
router.delete('/:walletId/members/:userId', removeWalletMember);
router.post('/:walletId/rotate', rotateWalletKey);
router.post('/:walletId/invites', createWalletInvite);
router.delete('/:walletId/invites/:inviteId', revokeWalletInvite);

export default router;
