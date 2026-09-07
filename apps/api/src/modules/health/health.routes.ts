import { monitorEventLoopDelay } from 'perf_hooks';
import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

// ── Event-loop lag monitor ────────────────────────────────────────────────────
// A histogram sampled at 20ms resolution; measurements are in nanoseconds.
// The monitor is module-scoped so it tracks cumulative lag rather than
// spinning up a fresh one per request.
const lagMonitor = monitorEventLoopDelay({ resolution: 20 });
lagMonitor.enable();

/** Current P99 event-loop lag in milliseconds (from the rolling histogram). */
function getEventLoopLagMs(): number {
  return lagMonitor.percentile(99) / 1e6;
}

/** Threshold above which the process is considered degraded. Read per-request
 *  so tests can override via `process.env.EVENT_LOOP_LAG_THRESHOLD_MS`. */
function getLagThresholdMs(): number {
  return Number(process.env.EVENT_LOOP_LAG_THRESHOLD_MS ?? 200);
}

const healthRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // ── GET /health (liveness) ──────────────────────────────────────────────────
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Liveness probe — checks the Node.js process is responsive',
        tags: ['Health'],
        response: {
          200: Type.Object({
            status: Type.Literal('ok'),
            timestamp: Type.String(),
            uptime: Type.Number(),
            environment: Type.String(),
          }),
        },
      },
    },
    async (_request, reply) => {
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV ?? 'development',
      });
    }
  );

  // ── GET /ready (readiness) ──────────────────────────────────────────────────
  fastify.get(
    '/ready',
    {
      schema: {
        description:
          'Readiness probe — verifies database connectivity and event-loop health before routing traffic',
        tags: ['Health'],
        response: {
          200: Type.Object({
            status: Type.Union([Type.Literal('ready'), Type.Literal('degraded')]),
            services: Type.Object({
              database: Type.Boolean(),
            }),
            eventLoop: Type.Object({
              lagMs: Type.Number({ description: 'P99 event-loop lag in milliseconds' }),
              healthy: Type.Boolean(),
            }),
            process: Type.Object({
              activeHandles: Type.Number(),
              activeRequests: Type.Number(),
            }),
            timestamp: Type.String(),
          }),
          503: Type.Object({
            status: Type.Literal('not_ready'),
            services: Type.Object({
              database: Type.Boolean(),
            }),
            eventLoop: Type.Object({
              lagMs: Type.Number(),
              healthy: Type.Boolean(),
            }),
            process: Type.Object({
              activeHandles: Type.Number(),
              activeRequests: Type.Number(),
            }),
            timestamp: Type.String(),
          }),
        },
      },
    },
    async (_request, reply) => {
      // ── Database check ────────────────────────────────────────────────────
      let isDatabaseReady = false;
      try {
        await fastify.prisma.$queryRaw`SELECT 1`;
        isDatabaseReady = true;
      } catch (err) {
        fastify.log.error({ err }, 'Database readiness check failed');
      }

      // ── Event-loop lag check ──────────────────────────────────────────────
      const lagMs = getEventLoopLagMs();
      const isEventLoopHealthy = lagMs < getLagThresholdMs();

      // ── Active handles / requests (Node.js internal process counters) ─────
      // process._getActiveHandles / _getActiveRequests are untyped but stable
      // since Node.js 0.10. We cast to avoid strict TS errors.
      const activeHandles: number =
        (process as NodeJS.Process & { _getActiveHandles?: () => unknown[] })
          ._getActiveHandles?.()?.length ?? 0;
      const activeRequests: number =
        (process as NodeJS.Process & { _getActiveRequests?: () => unknown[] })
          ._getActiveRequests?.()?.length ?? 0;

      // ── Determine overall readiness ───────────────────────────────────────
      const isReady = isDatabaseReady && isEventLoopHealthy;
      const status = isReady ? 'ready' : isDatabaseReady ? 'degraded' : 'not_ready';

      if (!isEventLoopHealthy) {
        fastify.log.warn({ lagMs }, 'Event-loop lag exceeds readiness threshold');
      }

      const statusCode = isReady ? 200 : 503;

      return reply.status(statusCode).send({
        status,
        services: { database: isDatabaseReady },
        eventLoop: { lagMs, healthy: isEventLoopHealthy },
        process: { activeHandles, activeRequests },
        timestamp: new Date().toISOString(),
      });
    }
  );
};

export default healthRoutes;
