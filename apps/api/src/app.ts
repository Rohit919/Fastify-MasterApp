import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { logger } from '@core/utils/logger.js';
import { registerGlobalHooks, registerErrorHandlers } from '@core/hooks/index.js';

// ── Infrastructure plugins ──────────────────────────────────────────────────
import envPlugin from './plugins/env.js';
import corsPlugin from './plugins/cors.js';
import redisPlugin from './plugins/redis.js';
import queuePlugin from './plugins/queue.js';
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import metricsPlugin from './plugins/metrics.js';
import swaggerPlugin from './plugins/swagger.js';

// ── Domain modules (vertical slices) ────────────────────────────────────────
import rootRoutes from './modules/root/root.routes.js';
import apiIndexRoutes from './modules/api-index/api-index.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import exampleRoutes from './modules/example/example.routes.js';
import todoRoutes from './modules/todos/todos.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: logger as any,
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    maxParamLength: 200,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // ── Infrastructure plugin registration (order matters) ──────────────────────
  await app.register(envPlugin);
  await app.register(corsPlugin);
  await app.register(redisPlugin);
  await app.register(queuePlugin);
  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(metricsPlugin);
  await app.register(swaggerPlugin);

  const sensiblePlugin = await import('@fastify/sensible');
  await app.register(sensiblePlugin.default);

  const helmetPlugin = await import('@fastify/helmet');
  await app.register(helmetPlugin.default, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger UI needs inline scripts
        styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI needs inline styles
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
      // Report-only in non-production so a bad directive doesn't break local dev.
      reportOnly: process.env.NODE_ENV !== 'production',
    },
    crossOriginEmbedderPolicy: false, // Swagger UI assets
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31_536_000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  });

  const rateLimitPlugin = await import('@fastify/rate-limit');
  await app.register(rateLimitPlugin.default, {
    max: app.config.RATE_LIMIT_MAX,
    timeWindow: app.config.RATE_LIMIT_TIME_WINDOW,
    // Distributed store: counters are shared across all API replicas via Redis.
    // If Redis is unreachable, @fastify/rate-limit falls back to its in-memory
    // store automatically (fail-open — degraded enforcement, not an outage).
    redis: app.redis,
    // Don't count health/readiness/metrics against the global limit.
    allowList: (req) => {
      const base = `${app.config.API_PREFIX}/${app.config.API_VERSION}`;
      return (
        req.url === `${base}/health` ||
        req.url === `${base}/ready` ||
        req.url === app.config.METRICS_PATH
      );
    },
  });

  // ── Global hooks (user context in logs, etc.) ───────────────────────────────
  registerGlobalHooks(app);

  // ── Root landing page (no API prefix) ───────────────────────────────────────
  await app.register(rootRoutes);

  // ── Versioned API — each module is a self-contained vertical slice ──────────
  await app.register(
    async function apiRoutes(fastify) {
      await fastify.register(apiIndexRoutes);
      await fastify.register(healthRoutes);
      await fastify.register(authRoutes, { prefix: '/auth' });
      await fastify.register(userRoutes, { prefix: '/users' });
      await fastify.register(exampleRoutes, { prefix: '/examples' });
      await fastify.register(todoRoutes, { prefix: '/todos' });
    },
    { prefix: `${app.config.API_PREFIX}/${app.config.API_VERSION}` }
  );

  // ── Error and 404 handlers ──────────────────────────────────────────────────
  registerErrorHandlers(app);

  // ── Graceful shutdown log ────────────────────────────────────────────────────
  app.addHook('onClose', async () => {
    logger.info('Server is shutting down...');
  });

  return app;
}
