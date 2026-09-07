/**
 * Test application factory.
 * Builds a fully wired Fastify instance with the real plugin/route stack but
 * with Prisma and env replaced by in-memory mocks so tests never need a
 * database connection or a .env file.
 */

import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fp from 'fastify-plugin';
import authPlugin from '../../plugins/auth.js';
import { registerErrorHandlers } from '../hooks/index.js';
import rootRoutes from '../../modules/root/root.routes.js';
import healthRoutes from '../../modules/health/health.routes.js';
import authRoutes from '../../modules/auth/auth.routes.js';
import userRoutes from '../../modules/users/users.routes.js';
import todoRoutes from '../../modules/todos/todos.routes.js';
import exampleRoutes from '../../modules/example/example.routes.js';
import type { Env } from '../../plugins/env.js';
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
  OTEL_ENABLED: false,
  OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318/v1/traces',
  OTEL_SERVICE_NAME: 'fastify-api-test',
};

// ─── mock Prisma type ─────────────────────────────────────────────────────────
export type MockPrisma = {
  // Top-level client methods ($connect, $queryRaw, etc.) are functions;
  // model accessors (user, todo, ...) are records of functions.
  [K in keyof PrismaClient]: K extends `$${string}`
    ? (...args: unknown[]) => unknown
    : Record<string, (...args: unknown[]) => unknown>;
};

export function buildMockPrisma(overrides: Partial<MockPrisma> = {}): MockPrisma {
  const defaults: Record<string, unknown> = {
    $connect: async () => {},
    $disconnect: async () => {},
    $queryRaw: async () => [{ '?column?': 1 }],
    user: {
      findUnique: async () => null,
      create: async () => null,
      update: async () => null,
    },
    todo: {
      findMany: async () => [],
      create: async () => null,
    },
    example: {
      findMany: async () => [],
      create: async () => null,
    },
    refreshToken: {
      create: async () => null,
      findUnique: async () => null,
      update: async () => null,
      updateMany: async () => ({ count: 0 }),
    },
  };

  // Deep-merge per-model: a test overriding `user.findUnique` still keeps the
  // default `user.update`, so handlers that touch multiple methods don't 500.
  const merged: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    const base = defaults[key];
    if (base && typeof base === 'object' && typeof value === 'object' && value !== null) {
      merged[key] = { ...(base as object), ...(value as object) };
    } else {
      merged[key] = value;
    }
  }

  return merged as unknown as MockPrisma;
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

  // Inject mock env — name inside fp() so dependency checks pass
  await app.register(
    fp(async (fastify) => { fastify.decorate('config', env); }, { name: 'env' })
  );

  // Inject mock prisma (cast — the mock only implements methods the tests exercise)
  await app.register(
    fp(async (fastify) => {
      fastify.decorate('prisma', mockPrisma as unknown as PrismaClient);
    }, { name: 'prisma' })
  );

  await app.register(authPlugin);

  const sensible = await import('@fastify/sensible');
  await app.register(sensible.default);

  await app.register(rootRoutes);

  await app.register(
    async (fastify) => {
      await fastify.register(healthRoutes);
      await fastify.register(authRoutes, { prefix: '/auth' });
      await fastify.register(userRoutes, { prefix: '/users' });
      await fastify.register(exampleRoutes, { prefix: '/examples' });
      await fastify.register(todoRoutes, { prefix: '/todos' });
    },
    { prefix: `${env.API_PREFIX}/${env.API_VERSION}` }
  );

  registerErrorHandlers(app);

  await app.ready();
  return app;
}

// ─── JWT helper ───────────────────────────────────────────────────────────────
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
