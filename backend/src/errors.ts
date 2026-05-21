export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly errors?: unknown;

  constructor(message: string = 'Validation error', errors?: unknown) {
    super(message, 400);
    this.errors = errors;
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

export class ExternalApiError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string = 'External service unavailable') {
    super(message, 502);
    this.service = service;
  }
}
