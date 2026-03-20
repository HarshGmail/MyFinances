import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    const status = res.statusCode;
    const statusIcon = status < 300 ? '✅' : status < 400 ? '↪️ ' : status < 500 ? '⚠️ ' : '❌';
    console.log(
      `[${timestamp}] ${statusIcon} ${req.method} ${req.originalUrl} → ${status} (${duration}ms)`
    );
  });

  next();
}

export function log(tag: string, msg: string, data?: unknown): void {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${ts}] [${tag}] ${msg}`, typeof data === 'object' ? JSON.stringify(data) : data);
  } else {
    console.log(`[${ts}] [${tag}] ${msg}`);
  }
}

export function logError(tag: string, msg: string, err?: unknown): void {
  const ts = new Date().toISOString();
  const detail = err instanceof Error ? err.message : String(err ?? '');
  console.error(`[${ts}] [${tag}] ❌ ${msg}${detail ? ` — ${detail}` : ''}`);
}
