import pino from 'pino';
import { Request, Response, NextFunction } from 'express';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  }),
});

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      { method: req.method, url: req.originalUrl, status: res.statusCode, duration },
      `${req.method} ${req.originalUrl} ${res.statusCode}`
    );
  });
  next();
}

export function log(tag: string, msg: string, data?: unknown): void {
  if (data !== undefined) {
    logger.info({ tag, data }, msg);
  } else {
    logger.info({ tag }, msg);
  }
}

export function logError(tag: string, msg: string, err?: unknown): void {
  logger.error({ tag, err }, msg);
}

export default logger;
