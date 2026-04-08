import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

const DEMO_EMAIL = 'testuser@gmail.com';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

// POSTs that are data fetches, not mutations — must be allowed for demo users
const DEMO_ALLOWED_PATHS = ['/api/auth/', '/api/crypto/getCoinPrices', '/api/funds/nav-history'];

export function blockDemoMutations(req: Request, res: Response, next: NextFunction): void {
  // Only check mutation HTTP methods
  if (!MUTATION_METHODS.has(req.method)) {
    next();
    return;
  }

  // Whitelist paths that are allowed for demo users (data-fetch POSTs, auth endpoints)
  if (DEMO_ALLOWED_PATHS.some((p) => req.path.startsWith(p) || req.path === p)) {
    next();
    return;
  }

  // Extract JWT from cookies or Authorization header
  const token =
    req.cookies?.token ||
    (req.headers?.authorization ? req.headers.authorization.replace('Bearer ', '') : undefined);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { email?: string };
    if (decoded.email === DEMO_EMAIL) {
      res.status(403).json({ success: false, message: 'Demo data is read-only' });
      return;
    }
  } catch {
    // Invalid token — let downstream authentication middleware handle it
  }

  next();
}
