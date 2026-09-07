/**
 * Stable, machine-readable error codes.
 *
 * These are part of the public API contract. Clients (Admin, external
 * consumers) branch on `error.code`, NEVER on `error.message`. Per
 * API_CONVENTIONS §39 and API_VERSIONING (Error Compatibility):
 *   - Codes are stable and must not be renamed without a compatibility plan.
 *   - Messages may evolve freely.
 *
 * Feature-specific codes (e.g. USER_EMAIL_ALREADY_EXISTS) are allowed and
 * should live alongside their module, but the generic + auth codes below cover
 * the cross-cutting cases every module shares.
 */
export const ErrorCode = {
  // Generic
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Security guards (SECURITY.md §23 path traversal, §24 file upload,
  // §30/§74 CSRF, §53 SSRF). Distinct codes let clients and observability
  // branch on the specific defense that fired.
  SSRF_BLOCKED: 'SSRF_BLOCKED',
  PATH_TRAVERSAL_BLOCKED: 'PATH_TRAVERSAL_BLOCKED',
  UNSAFE_FILE: 'UNSAFE_FILE',
  CSRF_FAILED: 'CSRF_FAILED',

  // Authentication-specific (API_CONTRACTS §17)
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
