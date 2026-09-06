/**
 * Error scenario integration tests
 *
 * Verifies the global error handler, 404 handler, and common error shapes
 * that cut across all routes.
 */
import { describe, it, expect, vi } from 'vitest';
import { buildTestApp, signTestToken } from '@utils/test-app.js';

// ─── 404 not found ────────────────────────────────────────────────────────────

describe('404 Not Found handler', () => {
  it('returns a consistent error shape for unknown routes', async () => {
    const app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Route not found');
    expect(body.error.statusCode).toBe(404);
    expect(body.error.path).toBe('/does-not-exist');
    expect(body.error.requestId).toBeDefined();
    expect(body.error.timestamp).toBeDefined();

    await app.close();
  });

  it('returns 404 for an unknown API sub-path', async () => {
    const app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: '/api/v1/nonexistent' });

    expect(res.statusCode).toBe(404);

    await app.close();
  });
});

// ─── 400 validation errors ────────────────────────────────────────────────────

describe('400 Validation errors', () => {
  it('returns 400 with validation details for malformed JSON body', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{ bad json }',
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 when required body fields are missing', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

// ─── 401 unauthorised ─────────────────────────────────────────────────────────

describe('401 Unauthorized errors', () => {
  it('returns 401 with consistent shape when bearer token is absent', async () => {
    const app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/verify' });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.success).toBe(false);

    await app.close();
  });

  it('returns 401 with consistent shape when bearer token is malformed', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/verify',
      headers: { authorization: 'Bearer not.a.real.token' },
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

// ─── 500 internal server errors ───────────────────────────────────────────────

describe('500 Internal server errors', () => {
  it('returns 500 and does not leak stack traces when Prisma throws', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockRejectedValue(new Error('DB connection refused')),
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(500);
    // Stack trace must not appear in the response body
    expect(res.body).not.toContain('at Object.');

    await app.close();
  });
});

// ─── Health endpoints ─────────────────────────────────────────────────────────

describe('Health endpoints', () => {
  it('GET /api/v1/health returns 200 ok', async () => {
    const app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.environment).toBe('test');
    expect(body.uptime).toBeTypeOf('number');

    await app.close();
  });

  it('GET /api/v1/ready returns 200 when DB is reachable', async () => {
    const app = await buildTestApp({
      prisma: {
        $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/v1/ready' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ready');
    expect(body.services.database).toBe(true);

    await app.close();
  });

  it('GET /api/v1/ready returns 503 when DB is unreachable', async () => {
    const app = await buildTestApp({
      prisma: {
        $queryRaw: vi.fn().mockRejectedValue(new Error('Connection refused')),
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/v1/ready' });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.status).toBe('not_ready');
    expect(body.services.database).toBe(false);

    await app.close();
  });
});

// ─── Users endpoints ──────────────────────────────────────────────────────────

describe('GET /api/v1/users/me', () => {
  const MOCK_USER = {
    id: 'user-test-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('returns 200 with the current user profile', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUnique: vi.fn().mockResolvedValue(MOCK_USER) },
      },
    });

    const token = signTestToken(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('test@example.com');
    expect(body.data).not.toHaveProperty('password');

    await app.close();
  });

  it('returns 401 when unauthenticated', async () => {
    const app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: '/api/v1/users/me' });

    expect(res.statusCode).toBe(401);

    await app.close();
  });
});
