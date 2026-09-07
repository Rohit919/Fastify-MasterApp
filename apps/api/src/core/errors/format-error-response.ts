import { AppError } from './app-error.js';

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
    timestamp: string;
    path?: string;
    requestId?: string;
  };
}

export function formatErrorResponse(
  error: Error | AppError,
  path?: string,
  requestId?: string
): ErrorResponse {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const details = error instanceof AppError ? error.details : undefined;
  return {
    success: false,
    error: {
      message: error.message,
      code: error.name,
      statusCode,
      details,
      timestamp: new Date().toISOString(),
      path,
      requestId,
    },
  };
}
