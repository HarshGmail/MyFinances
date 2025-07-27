import { Router } from 'express';
import { signup, login, logout, userProfile, updateUserProfile } from '../controllers';
import { authenticateToken } from '../middleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', authenticateToken, userProfile);
router.put('/profile', authenticateToken, updateUserProfile);

export default router;
