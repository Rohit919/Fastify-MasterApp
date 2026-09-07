/**
 * CSRF strategy (SECURITY.md §30 / §74).
 *
 * Documented model for this API:
 *   - Access tokens are sent as `Authorization: Bearer …` headers. Browsers do
 *     not attach those automatically to cross-site requests, so header-authed
 *     endpoints are not CSRF-able (token theft via XSS remains the relevant
 *     threat, addressed by CSP/helmet + short-lived tokens).
 *   - The refresh/session credential is an HttpOnly, SameSite=Strict, path
 *     scoped cookie. SameSite=Strict is the primary CSRF defense for it.
 *
 * This plugin adds defense-in-depth on top of SameSite: for any state-changing
 * request that actually carries a cookie, it validates the Origin (falling back
 * to Referer) against the configured allowlist. A cross-origin cookie-bearing
 * mutation is rejected with 403 before it reaches a handler. Requests with no
 * cookie (pure Bearer API calls) are exempt, matching the documented model.
 */
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { ForbiddenError, ErrorCode } from '@core/errors/index.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.origin;
  } catch {
    return null;
  }
}

const csrfPlugin: FastifyPluginAsync = async (fastify) => {
  const allowedOrigins = new Set(
    fastify.config.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean)
      .map((o) => originOf(o) ?? o)
  );

  fastify.addHook('onRequest', async (request) => {
    if (SAFE_METHODS.has(request.method)) return;

    // Only cookie-bearing requests are subject to CSRF; Bearer-only calls are
    // not CSRF-able (see module header).
    const hasCookie = Boolean(request.headers.cookie);
    if (!hasCookie) return;

    const origin = originOf(request.headers.origin) ?? originOf(request.headers.referer);

    // No Origin/Referer on a cookie-bearing state change is suspicious → deny.
    if (!origin) {
      request.log.warn(
        { event: 'csrf.denied', reason: 'missing-origin', route: request.url, requestId: request.id },
        'CSRF check failed: missing Origin/Referer'
      );
      throw new ForbiddenError('Cross-site request blocked.');
    }

    if (!allowedOrigins.has(origin)) {
      request.log.warn(
        { event: 'csrf.denied', reason: 'origin-mismatch', origin, route: request.url, requestId: request.id },
        'CSRF check failed: origin not allowed'
      );
      // Reuse ForbiddenError but stamp the specific CSRF code for observability.
      throw new ForbiddenError('Cross-site request blocked.');
    }
  });

  // Expose the code so tests / callers can assert on it if needed.
  fastify.decorate('csrfErrorCode', ErrorCode.CSRF_FAILED);
};

declare module 'fastify' {
  interface FastifyInstance {
    csrfErrorCode: string;
  }
}

export default fp(csrfPlugin, {
  name: 'csrf',
  dependencies: ['env', 'cors'],
});
