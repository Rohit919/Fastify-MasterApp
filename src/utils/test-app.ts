/**
 * Test application factory
 *
 * Builds a fully wired Fastify instance with the real plugin/route stack but
 * with Prisma and env replaced by in-memory mocks so tests never need a
 * database connection or a .env file.
 */

import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fp from 'fastify-plugin';
import authPlugin from '../plugins/auth.js';
import rootRoutes from '../routes/root.js';
import healthRoutes from '../routes/health/index.js';
import authRoutes from '../routes/auth/index.js';
import userRoutes from '../routes/users/index.js';
import todoRoutes from '../routes/todos/index.js';
import type { Env } from '../plugins/env.js';
import type { PrismaClient } from '@prisma/client';

// ─── default test env ─────────────────────────────────────────────────────────

export const TEST_ENV: Env = {
  NODE_ENV: 'test',
  PORT: 3000,
  HOST: '127.0.0.1',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256',
  JWT_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  API_PREFIX: '/api',
  API_VERSION: 'v1',
  RATE_LIMIT_MAX: 1000,
  RATE_LIMIT_TIME_WINDOW: 60000,
  CORS_ORIGIN: 'http://localhost:3000',
  CORS_CREDENTIALS: true,
  METRICS_ENABLED: false,
  METRICS_PATH: '/metrics',
  SWAGGER_ENABLED: false,
  SWAGGER_PATH: '/documentation',
};

// ─── mock Prisma type ─────────────────────────────────────────────────────────

export type MockPrisma = {
  [K in keyof PrismaClient]: K extends '$connect' | '$disconnect'
    ? () => Promise<void>
    : Record<string, (...args: unknown[]) => unknown>;
};

export function buildMockPrisma(overrides: Partial<MockPrisma> = {}): MockPrisma {
  return {
    $connect: async () => {},
    $disconnect: async () => {},
    $queryRaw: async () => [{ '?column?': 1 }],
    user: {
      findUnique: async () => null,
      create: async () => null,
    },
    todo: {
      findMany: async () => [],
      create: async () => null,
    },
    refreshToken: {
      create: async () => null,
      findUnique: async () => null,
      update: async () => null,
      updateMany: async () => ({ count: 0 }),
    },
    ...overrides,
  } as unknown as MockPrisma;
}

// ─── app builder ─────────────────────────────────────────────────────────────

export interface BuildTestAppOptions {
  prisma?: Partial<MockPrisma>;
  env?: Partial<Env>;
}

export async function buildTestApp(options: BuildTestAppOptions = {}) {
  const env = { ...TEST_ENV, ...options.env };
  const mockPrisma = buildMockPrisma(options.prisma ?? {});

  const app = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();

  // ── inject env ──────────────────────────────────────────────────────────────
  // Bypass @fastify/env entirely — decorate directly.
  // The plugin name MUST be inside fp() so Fastify's dependency checker
  // recognises it when auth/metrics declare dependencies: ['env'].
  await app.register(
    fp(async (fastify) => { fastify.decorate('config', env); }, { name: 'env' })
  );

  // ── inject prisma ───────────────────────────────────────────────────────────
  // Same approach — name inside fp() so other plugins can depend on 'prisma'.
  await app.register(
    fp(async (fastify) => { fastify.decorate('prisma', mockPrisma); }, { name: 'prisma' })
  );

  // ── real plugins (depend on env / prisma being already decorated) ───────────
  await app.register(authPlugin);
  // Skip metricsPlugin in tests — prom-client uses a global singleton registry
  // and calling collectDefaultMetrics() more than once per process throws.
  // We also set METRICS_ENABLED:false in TEST_ENV so no /metrics route is needed.

  // ── sensible ────────────────────────────────────────────────────────────────
  const sensible = await import('@fastify/sensible');
  await app.register(sensible.default);

  // ── routes ──────────────────────────────────────────────────────────────────
  await app.register(rootRoutes);

  await app.register(
    async (fastify) => {
      await fastify.register(healthRoutes);
      await fastify.register(authRoutes, { prefix: '/auth' });
      await fastify.register(userRoutes, { prefix: '/users' });
      await fastify.register(todoRoutes, { prefix: '/todos' });
    },
    { prefix: `${env.API_PREFIX}/${env.API_VERSION}` }
  );

  // ── error handler (mirrors app.ts) ──────────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      success: false,
      error: {
        message: error.message || 'Internal Server Error',
        statusCode,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        message: 'Route not found',
        statusCode: 404,
        requestId: request.id,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  });

  await app.ready();
  return app;
}

// ─── JWT helper ───────────────────────────────────────────────────────────────

/**
 * Returns a signed access token for a test user without going through /login.
 * Requires the app to be fully booted so fastify.jwt is available.
 */
export function signTestToken(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  payload: { id: string; email: string; role: string } = {
    id: 'user-test-id',
    email: 'test@example.com',
    role: 'user',
  }
): string {
  return app.jwt.sign(payload);
}
