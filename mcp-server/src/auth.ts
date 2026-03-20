import { Request, Response, NextFunction } from 'express';

const SITE_URL = (process.env.SITE_URL ?? 'https://mcp.my-finances.site').replace(/\/$/, '');

declare global {
  namespace Express {
    interface Request {
      ingestToken?: string;
    }
  }
}

export function mcpAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  // Log every incoming auth attempt so we can see exactly what Claude.ai sends
  console.log(
    `[AUTH] ${req.method} ${req.path} | authorization="${authHeader ?? 'MISSING'}" | session="${req.headers['mcp-session-id'] ?? 'none'}"`
  );

  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    // RFC 6750 — tell the client where to find the OAuth server
    res.setHeader(
      'WWW-Authenticate',
      `Bearer realm="${SITE_URL}", resource_metadata="${SITE_URL}/.well-known/oauth-protected-resource"`
    );
    res.status(401).json({ error: 'Unauthorized. Authenticate via OAuth.' });
    return;
  }
  req.ingestToken = authHeader.split(' ')[1];
  next();
}
