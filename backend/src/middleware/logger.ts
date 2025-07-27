import { Response, NextFunction } from 'express';
import { AuthRequest } from './jwt'; // This gives access to req.user

export function requestLogger(req: AuthRequest, res: Response, next: NextFunction): void {
  const start = Date.now();

  // After response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;

    const method = req.method;
    const endpoint = req.originalUrl;
    const status = res.statusCode;
    const timestamp = new Date().toISOString();

    const user = req.user || { userId: 'non', name: 'Anonymous', email: 'notAvailable' };

    const name = user.name;
    const email = user.email;
    const userId = user.userId;

    console.log(
      `[${timestamp}] ${method} ${endpoint} ${status} ${userId} ${name} ${email} (${duration}ms)`
    );
  });

  next();
}
