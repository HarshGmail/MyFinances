import jwt from 'jsonwebtoken';
import { Response, Request } from 'express';
import config from '../config';

interface UserData {
  name: string;
  email: string;
  id: string;
}

const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60;
const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;

export function generateToken(userData: UserData): string {
  return jwt.sign(
    {
      name: userData.name,
      email: userData.email,
      userId: userData.id,
    },
    config.JWT_SECRET,
    { expiresIn: SESSION_DURATION_SECONDS }
  );
}

export function setAuthCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    maxAge: SESSION_DURATION_MS,
    sameSite: 'lax',
    domain: isProd ? '.my-finances.site' : undefined,
  });
}

export function clearAuthCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain: isProd ? '.my-finances.site' : undefined,
  });
}

export function refreshAuthCookieIfStale(
  res: Response,
  payload: { name?: string; email?: string; userId: string; exp?: number }
): void {
  const refreshed = reissueTokenIfStale(payload);
  if (refreshed) setAuthCookie(res, refreshed);
}

export function tokenExpiresAt(token: string): string | null {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  return decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null;
}

export function reissueTokenIfStale(payload: {
  name?: string;
  email?: string;
  userId: string;
  exp?: number;
}): string | null {
  if (!payload.exp || !payload.name || !payload.email) return null;
  const secondsUntilExpiry = payload.exp - Math.floor(Date.now() / 1000);
  if (secondsUntilExpiry > SESSION_DURATION_SECONDS / 2) return null;
  return generateToken({ name: payload.name, email: payload.email, id: payload.userId });
}

export function authenticateUser(res: Response, userData: UserData): string {
  const token = generateToken(userData);
  setAuthCookie(res, token);
  return token;
}

export function getUserFromRequest(
  req: Request
): { userId: string; name?: string; email?: string; iat?: number; exp?: number } | null {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as {
      userId: string;
      name?: string;
      email?: string;
      iat?: number;
      exp?: number;
    };
    return payload;
  } catch {
    return null;
  }
}
