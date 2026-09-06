import { AppError } from './app-error.js';

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, true, details);
    this.name = 'ConflictError';
  }
}
