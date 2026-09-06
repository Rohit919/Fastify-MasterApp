import { AppError } from './app-error.js';

/**
 * Thrown when a circuit breaker is OPEN — the wrapped call fails fast without
 * attempting the (likely-failing) downstream request. 503 = temporary.
 */
export class CircuitOpenError extends AppError {
  constructor(service: string) {
    super(`Circuit open for "${service}" — downstream temporarily unavailable`, 503, true);
    this.name = 'CircuitOpenError';
  }
}
