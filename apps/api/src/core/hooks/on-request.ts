import type { FastifyInstance } from 'fastify';

/**
 * onRequest hook — earliest per-request lifecycle point.
 *
 * Placeholder for request-scoped setup that must run before body parsing:
 * e.g. high-resolution timing start, trace context extraction, request tagging.
 * Metrics timing currently lives in the metrics plugin; move it here if you
 * want a single onRequest entry point.
 */
export function registerOnRequestHook(_app: FastifyInstance): void {
  // Intentionally empty for now — reserved for cross-cutting onRequest logic.
  // Example:
  // _app.addHook('onRequest', async (request) => {
  //   request.startHrTime = process.hrtime.bigint();
  // });
}
