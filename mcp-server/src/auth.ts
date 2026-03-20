import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      ingestToken?: string;
    }
  }
}

export function mcpAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header. Use your ingest token as Bearer token.' });
    return;
  }
  req.ingestToken = authHeader.split(' ')[1];
  next();
}
