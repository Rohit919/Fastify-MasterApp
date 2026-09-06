import { AppError } from './app-error.js';

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, true, details);
    this.name = 'ValidationError';
  }
}
