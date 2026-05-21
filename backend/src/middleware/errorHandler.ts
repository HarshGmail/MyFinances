import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../errors';
import logger from '../utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.issues,
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path }, 'AppError');
    } else {
      logger.warn({ err: { name: err.name, message: err.message }, path: req.path }, 'AppError');
    }

    const body: Record<string, unknown> = {
      success: false,
      message: err.message,
    };
    if (err instanceof ValidationError && err.errors) {
      body.errors = err.errors;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
