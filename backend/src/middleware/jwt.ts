import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

export interface AuthRequest extends Request {
  user?: { name: string; email: string };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  // Check for token in Authorization header or cookies
  let token: string | undefined;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }
    req.user = user as { name: string; email: string };
    next();
  });
}
