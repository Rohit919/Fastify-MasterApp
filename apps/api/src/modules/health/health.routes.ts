import { monitorEventLoopDelay } from "perf_hooks";
import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { listCircuitBreakers } from "@core/circuit-breaker.js";

// ── Event-loop lag monitor ────────────────────────────────────────────────────
// A histogram sampled at 20ms resolution; measurements are in nanoseconds.
// The monitor is module-scoped so it tracks cumulative lag rather than
// spinning up a fresh one per request.
const lagMonitor = monitorEventLoopDelay({ resolution: 20 });
lagMonitor.enable();
// Keep readiness representative of a recent window rather than the entire
// process lifetime, where one historical spike could poison P99 forever.
const lagResetTimer = setInterval(() => lagMonitor.reset(), 60_000);
lagResetTimer.unref();

/** Current P99 event-loop lag in milliseconds (from the rolling histogram). */
function getEventLoopLagMs(): number {
  return lagMonitor.percentile(99) / 1e6;
}

/** Threshold above which the process is considered degraded. Read per-request
 *  so tests can override via `process.env.EVENT_LOOP_LAG_THRESHOLD_MS`. */
function getLagThresholdMs(): number {
  return Number(process.env.EVENT_LOOP_LAG_THRESHOLD_MS ?? 200);
}

// ── Shared response sub-schemas ───────────────────────────────────────────────
const ServicesSchema = Type.Object({
  database: Type.Boolean(),
  redis: Type.Boolean(),
});

const EventLoopSchema = Type.Object({
  lagMs: Type.Number({ description: "P99 event-loop lag in milliseconds" }),
  healthy: Type.Boolean(),
});

const ProcessSchema = Type.Object({
  activeHandles: Type.Number(),
  activeRequests: Type.Number(),
});

const CircuitBreakersSchema = Type.Object({
  openBreakers: Type.Array(Type.String(), {
    description: "Names of circuit breakers currently in OPEN state",
  }),
  allClosed: Type.Boolean(),
});

const ReadyResponseBase = {
  services: ServicesSchema,
  eventLoop: EventLoopSchema,
  process: ProcessSchema,
  circuitBreakers: CircuitBreakersSchema,
  timestamp: Type.String(),
};

const healthRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // ── GET /health (liveness) ──────────────────────────────────────────────────
  fastify.get(
    "/health",
    {
      schema: {
        description:
          "Liveness probe — checks the Node.js process is responsive",
        tags: ["Health"],
        response: {
          200: Type.Object({
            status: Type.Literal("ok"),
            timestamp: Type.String(),
            uptime: Type.Number(),
            environment: Type.String(),
          }),
        },
      },
    },
    async (_request, reply) => {
      return reply.send({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV ?? "development",
      });
    },
  );

  // ── GET /ready (readiness) ──────────────────────────────────────────────────
  fastify.get(
    "/ready",
    {
      schema: {
        description:
          "Readiness probe — verifies database, Redis, event-loop health, and circuit-breaker state before routing traffic",
        tags: ["Health"],
        response: {
          200: Type.Object({
            status: Type.Union([
              Type.Literal("ready"),
              Type.Literal("degraded"),
            ]),
            ...ReadyResponseBase,
          }),
          503: Type.Object({
            status: Type.Union([
              Type.Literal("not_ready"),
              Type.Literal("degraded"),
            ]),
            ...ReadyResponseBase,
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
        fastify.log.error({ err }, "Database readiness check failed");
      }

      // ── Redis check ───────────────────────────────────────────────────────
      let isRedisReady = false;
      try {
        const pong = await fastify.redis.ping();
        isRedisReady = pong === "PONG";
      } catch (err) {
        fastify.log.warn({ err }, "Redis readiness check failed");
      }

      // ── Circuit-breaker check ─────────────────────────────────────────────
      // Inspect the live registry instead of a hardcoded dependency list.
      const openBreakers = listCircuitBreakers()
        .filter((breaker) => breaker.opened)
        .map((breaker) => breaker.name);
      const allCircuitsClosed = openBreakers.length === 0;

      // ── Event-loop lag check ──────────────────────────────────────────────
      const lagMs = getEventLoopLagMs();
      const isEventLoopHealthy = lagMs < getLagThresholdMs();

      // ── Active handles / requests (Node.js internal process counters) ─────
      // process._getActiveHandles / _getActiveRequests are untyped but stable
      // since Node.js 0.10. We cast to avoid strict TS errors.
      const activeHandles: number =
        (
          process as NodeJS.Process & { _getActiveHandles?: () => unknown[] }
        )._getActiveHandles?.()?.length ?? 0;
      const activeRequests: number =
        (
          process as NodeJS.Process & { _getActiveRequests?: () => unknown[] }
        )._getActiveRequests?.()?.length ?? 0;

      // DB and event-loop health are always required. Redis participates in
      // readiness only when the deployment explicitly marks it required;
      // otherwise queues/rate limiting are allowed to degrade without removing
      // every API replica from service.
      const coreReady =
        isDatabaseReady &&
        isEventLoopHealthy &&
        (!fastify.config.REDIS_REQUIRED || isRedisReady);
      const fullyReady = coreReady && isRedisReady && allCircuitsClosed;
      const status = fullyReady
        ? "ready"
        : coreReady
          ? "degraded"
          : "not_ready";

      if (!isRedisReady) {
        fastify.log.warn(
          { required: fastify.config.REDIS_REQUIRED },
          "Redis is not responding — service is degraded",
        );
      }
      if (openBreakers.length > 0) {
        fastify.log.warn(
          { openBreakers },
          "Open circuit breakers detected — marking as degraded",
        );
      }
      if (!isEventLoopHealthy) {
        fastify.log.warn(
          { lagMs },
          "Event-loop lag exceeds readiness threshold",
        );
      }

      const statusCode = coreReady ? 200 : 503;

      return reply.status(statusCode).send({
        status,
        services: { database: isDatabaseReady, redis: isRedisReady },
        eventLoop: { lagMs, healthy: isEventLoopHealthy },
        process: { activeHandles, activeRequests },
        circuitBreakers: { openBreakers, allClosed: allCircuitsClosed },
        timestamp: new Date().toISOString(),
      });
    },
  );
};

export default healthRoutes;
