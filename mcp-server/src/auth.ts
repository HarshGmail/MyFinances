import { Request, Response, NextFunction } from 'express';
import logger from './logger';

const SITE_URL = (process.env.SITE_URL ?? 'https://mcp.my-finances.site').replace(/\/$/, '');

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ingestToken?: string;
    }
  }
}

export function setAuthChallengeHeader(res: Response, error?: string): void {
  const params = [`realm="${SITE_URL}"`];
  if (error) params.push(`error="${error}"`);
  params.push(`resource_metadata="${SITE_URL}/.well-known/oauth-protected-resource"`);
  res.setHeader('WWW-Authenticate', `Bearer ${params.join(', ')}`);
}

export function mcpAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  logger.debug(
    {
      method: req.method,
      path: req.path,
      authorization: authHeader ? 'present' : 'MISSING',
      session: req.headers['mcp-session-id'] ?? 'none',
    },
    'incoming auth attempt'
  );

  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    // RFC 6750 — tell the client where to find the OAuth server
    setAuthChallengeHeader(res);
    res.status(401).json({ error: 'Unauthorized. Authenticate via OAuth.' });
    return;
  }
  req.ingestToken = authHeader.split(' ')[1];
  next();
}
