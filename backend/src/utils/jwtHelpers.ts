import jwt from 'jsonwebtoken';
import { Response, Request } from 'express';
import config from '../config';

interface UserData {
  name: string;
  email: string;
  id: string;
}

export function generateToken(userData: UserData): string {
  return jwt.sign(
    {
      name: userData.name,
      email: userData.email,
      userId: userData.id,
    },
    config.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite:  process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
  });
}

export function authenticateUser(res: Response, userData: UserData): string {
  const token = generateToken(userData);
  setAuthCookie(res, token);
  return token;
}

export function getUserFromRequest(
  req: Request
): { userId: string; name?: string; email?: string; iat?: number; exp?: number } | null {
  const token = req.cookies?.token;
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
