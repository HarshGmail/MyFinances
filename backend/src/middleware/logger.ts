import { IncomingMessage } from 'http';
import { ServerResponse } from 'http';
import pinoHttp from 'pino-http';
import logger from '../utils/logger';
import { AuthRequest } from './jwt';

export const requestLogger = pinoHttp({
  logger,
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse, responseTime: number) =>
    `${req.method} ${req.url} ${res.statusCode} ${(responseTime / 1000).toFixed(2)}s`,
  customErrorMessage: (req: IncomingMessage, res: ServerResponse, err: Error) =>
    `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
  customProps: (req) => {
    const user = (req as AuthRequest).user;
    return user ? { userId: user.userId, userEmail: user.email, userName: user.name } : {};
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
