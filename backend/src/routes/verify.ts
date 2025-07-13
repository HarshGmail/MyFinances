import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware';

const router = Router();

// Verify token endpoint
router.get('/verify', authenticateToken, (req: Request, res: Response) => {
  try {
    // If middleware passed, token is valid
    const authReq = req as AuthRequest;
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: authReq.user,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
