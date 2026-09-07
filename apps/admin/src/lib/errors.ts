import { ApiError } from '@/lib/api-client';

/**
 * Centralized mapping from a thrown error to a user-facing message. Branches on
 * the stable ApiError.code (never the message) per the backend's error
 * contract. Keeps HTTP-status parsing out of individual components.
 *
 * `t` is the i18next translator; pass it so messages localize. Falls back to
 * sensible English if no translator is provided.
 */
type Translator = (key: string, fallback: string) => string;

const defaultT: Translator = (_key, fallback) => fallback;

export function mapApiError(error: unknown, t: Translator = defaultT): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return t('errors.invalidCredentials', 'Invalid email or password.');
      case 'ACCOUNT_LOCKED':
      case 'RATE_LIMITED':
        return t('errors.rateLimited', 'Too many attempts. Please try again later.');
      case 'UNAUTHORIZED':
      case 'TOKEN_MISSING':
      case 'TOKEN_INVALID':
      case 'TOKEN_EXPIRED':
      case 'TOKEN_REVOKED':
        return t('errors.unauthorized', 'Your session has expired. Please sign in again.');
      case 'FORBIDDEN':
        return t('errors.forbidden', 'You do not have permission to do that.');
      case 'NOT_FOUND':
        return t('errors.notFound', 'The requested resource was not found.');
      case 'CONFLICT':
        return t('errors.conflict', 'That conflicts with existing data.');
      case 'VALIDATION_ERROR':
        return error.message || t('errors.validation', 'Please check the form and try again.');
      case 'OTP_INVALID':
      case 'OTP_EXPIRED':
        return t('errors.otpInvalid', 'Invalid or expired code.');
      case 'SERVICE_UNAVAILABLE':
        return t('errors.serviceUnavailable', 'Service temporarily unavailable.');
      case 'TIMEOUT':
        return t('errors.timeout', 'The request timed out. Please try again.');
      case 'NETWORK_ERROR':
        return t('errors.network', 'Network error. Check your connection and try again.');
      default:
        return error.message || t('errors.generic', 'Something went wrong.');
    }
  }
  if (error instanceof Error) {
    // Network / fetch failures land here (no ApiError).
    return t('errors.network', 'Network error. Check your connection and try again.');
  }
  return t('errors.generic', 'Something went wrong.');
}

/** True when the error represents an authentication/session failure. */
export function isAuthError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    ['UNAUTHORIZED', 'TOKEN_MISSING', 'TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_REVOKED'].includes(
      error.code
    )
  );
}

/** True when the error is a 403 permission denial. */
export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'FORBIDDEN' || error.statusCode === 403);
}

/** Extract the server request id from an error, if present (for support/logs). */
export function getRequestId(error: unknown): string | undefined {
  return error instanceof ApiError ? error.requestId : undefined;
}
