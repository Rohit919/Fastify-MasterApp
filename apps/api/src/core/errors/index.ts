/**
 * Application error hierarchy — barrel.
 * Import from '@core/errors' anywhere in the codebase.
 */
export { AppError } from './app-error.js';
export { ValidationError } from './validation-error.js';
export { NotFoundError } from './not-found-error.js';
export { UnauthorizedError } from './unauthorized-error.js';
export { ForbiddenError } from './forbidden-error.js';
export { ConflictError } from './conflict-error.js';
export { RateLimitError } from './rate-limit-error.js';
export { CircuitOpenError } from './circuit-open-error.js';
export { formatErrorResponse, type ErrorResponse } from './format-error-response.js';
