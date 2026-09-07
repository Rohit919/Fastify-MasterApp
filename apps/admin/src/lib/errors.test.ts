import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { getRequestId, isAuthError, isForbiddenError, mapApiError } from '@/lib/errors';

describe('mapApiError', () => {
  it('maps invalid credentials to a friendly message', () => {
    const msg = mapApiError(new ApiError('nope', 401, undefined, 'INVALID_CREDENTIALS'));
    expect(msg).toMatch(/invalid email or password/i);
  });

  it('maps rate limiting / account lock', () => {
    expect(mapApiError(new ApiError('x', 429, undefined, 'RATE_LIMITED'))).toMatch(/too many/i);
  });

  it('maps session/token errors to a re-auth message', () => {
    expect(mapApiError(new ApiError('x', 401, undefined, 'TOKEN_EXPIRED'))).toMatch(
      /session has expired/i
    );
  });

  it('maps the new TIMEOUT code', () => {
    expect(mapApiError(new ApiError('x', 0, undefined, 'TIMEOUT'))).toMatch(/timed out/i);
  });

  it('maps NETWORK_ERROR', () => {
    expect(mapApiError(new ApiError('x', 0, undefined, 'NETWORK_ERROR'))).toMatch(/network/i);
  });

  it('falls back to the message for unknown codes', () => {
    expect(mapApiError(new ApiError('Custom boom', 500, undefined, 'WEIRD'))).toBe('Custom boom');
  });

  it('handles non-ApiError values', () => {
    expect(mapApiError(new Error('kaboom'))).toMatch(/network/i);
    expect(mapApiError('a string')).toMatch(/something went wrong/i);
  });

  it('uses the provided translator when given', () => {
    const t = (key: string) => `T:${key}`;
    expect(mapApiError(new ApiError('x', 403, undefined, 'FORBIDDEN'), t)).toBe('T:errors.forbidden');
  });
});

describe('error predicates', () => {
  it('isAuthError detects session failures', () => {
    expect(isAuthError(new ApiError('x', 401, undefined, 'TOKEN_REVOKED'))).toBe(true);
    expect(isAuthError(new ApiError('x', 403, undefined, 'FORBIDDEN'))).toBe(false);
  });

  it('isForbiddenError detects 403 / FORBIDDEN', () => {
    expect(isForbiddenError(new ApiError('x', 403, undefined, 'FORBIDDEN'))).toBe(true);
    expect(isForbiddenError(new ApiError('x', 403, undefined, 'SOMETHING'))).toBe(true);
    expect(isForbiddenError(new ApiError('x', 404, undefined, 'NOT_FOUND'))).toBe(false);
  });

  it('getRequestId extracts the id when present', () => {
    expect(getRequestId(new ApiError('x', 500, 'req-123', 'INTERNAL_ERROR'))).toBe('req-123');
    expect(getRequestId(new Error('plain'))).toBeUndefined();
  });
});
