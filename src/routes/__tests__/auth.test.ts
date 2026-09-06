import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { buildTestApp, signTestToken } from '@utils/test-app.js';

// ─── shared fixtures ──────────────────────────────────────────────────────────

const HASHED_PASSWORD = await bcrypt.hash('password123', 10);

const MOCK_USER = {
  id: 'user-test-id',
  email: 'test@example.com',
  password: HASHED_PASSWORD,
  name: 'Test User',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const BASE_URL = '/api/v1/auth';

// ─── POST /login ──────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('returns 200 with accessToken and refreshToken on valid credentials', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUnique: vi.fn().mockResolvedValue(MOCK_USER) },
        refreshToken: {
          create: vi.fn().mockResolvedValue({ id: 'rt-1', token: 'refresh-abc' }),
          findUnique: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/login`,
      payload: { email: 'test@example.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTypeOf('string');
    expect(body.data.refreshToken).toBeTypeOf('string');
    expect(body.data.user.email).toBe('test@example.com');
    expect(body.data.user).not.toHaveProperty('password');

    await app.close();
  });

  it('returns 401 for unknown email', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUnique: vi.fn().mockResolvedValue(null) },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/login`,
      payload: { email: 'nobody@example.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns 401 for wrong password', async () => {
    const app = await buildTestApp({
      prisma: {
        user: { findUnique: vi.fn().mockResolvedValue(MOCK_USER) },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/login`,
      payload: { email: 'test@example.com', password: 'wrongpassword' },
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns 400 for invalid email format', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/login`,
      payload: { email: 'not-an-email', password: 'password123' },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 when password is too short', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/login`,
      payload: { email: 'test@example.com', password: '123' },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

// ─── POST /register ───────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('returns 201 with tokens on successful registration', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue(null), // no duplicate
          create: vi.fn().mockResolvedValue(MOCK_USER),
        },
        refreshToken: {
          create: vi.fn().mockResolvedValue({ id: 'rt-2', token: 'refresh-xyz' }),
          findUnique: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/register`,
      payload: { email: 'new@example.com', password: 'password123', name: 'New User' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTypeOf('string');
    expect(body.data.refreshToken).toBeTypeOf('string');
    expect(body.data.user.name).toBe('Test User');

    await app.close();
  });

  it('returns 400 when email is already registered', async () => {
    const app = await buildTestApp({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue(MOCK_USER), // duplicate
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/register`,
      payload: { email: 'test@example.com', password: 'password123', name: 'Dup User' },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 when name is missing', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/register`,
      payload: { email: 'test@example.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

// ─── POST /refresh ────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  const STORED_TOKEN = {
    id: 'rt-stored',
    token: 'valid-refresh-token',
    userId: MOCK_USER.id,
    expiresAt: new Date(Date.now() + 86_400_000), // 1 day from now
    revokedAt: null,
    createdAt: new Date(),
    user: MOCK_USER,
  };

  it('returns 200 with new token pair and rotates the refresh token', async () => {
    const updateMock = vi.fn().mockResolvedValue({ ...STORED_TOKEN, revokedAt: new Date() });
    const createMock = vi.fn().mockResolvedValue({ id: 'rt-new', token: 'new-refresh-token' });

    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(STORED_TOKEN),
          update: updateMock,
          create: createMock,
          updateMany: vi.fn(),
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/refresh`,
      payload: { refreshToken: 'valid-refresh-token' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTypeOf('string');
    expect(body.data.refreshToken).toBeTypeOf('string');

    // Old token must have been revoked
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rt-stored' } })
    );

    await app.close();
  });

  it('returns 401 for an unknown refresh token', async () => {
    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
          create: vi.fn(),
          updateMany: vi.fn(),
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/refresh`,
      payload: { refreshToken: 'does-not-exist' },
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns 401 for an already-revoked refresh token', async () => {
    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue({ ...STORED_TOKEN, revokedAt: new Date() }),
          update: vi.fn(),
          create: vi.fn(),
          updateMany: vi.fn(),
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/refresh`,
      payload: { refreshToken: 'valid-refresh-token' },
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns 401 for an expired refresh token', async () => {
    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn().mockResolvedValue({
            ...STORED_TOKEN,
            expiresAt: new Date(Date.now() - 1000), // past
          }),
          update: vi.fn(),
          create: vi.fn(),
          updateMany: vi.fn(),
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/refresh`,
      payload: { refreshToken: 'valid-refresh-token' },
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('returns 200 and revokes the token', async () => {
    const updateManyMock = vi.fn().mockResolvedValue({ count: 1 });

    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: updateManyMock,
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/logout`,
      payload: { refreshToken: 'any-token' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    expect(updateManyMock).toHaveBeenCalledOnce();

    await app.close();
  });

  it('returns 200 even for an unknown token (idempotent)', async () => {
    const app = await buildTestApp({
      prisma: {
        refreshToken: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // nothing matched
        },
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `${BASE_URL}/logout`,
      payload: { refreshToken: 'ghost-token' },
    });

    expect(res.statusCode).toBe(200);

    await app.close();
  });
});

// ─── GET /verify ──────────────────────────────────────────────────────────────

describe('GET /api/v1/auth/verify', () => {
  it('returns 200 with user payload for a valid token', async () => {
    const app = await buildTestApp();
    const token = signTestToken(app);

    const res = await app.inject({
      method: 'GET',
      url: `${BASE_URL}/verify`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('test@example.com');

    await app.close();
  });

  it('returns 401 when no token is provided', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: `${BASE_URL}/verify`,
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns 401 for a tampered token', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: `${BASE_URL}/verify`,
      headers: { authorization: 'Bearer totally.fake.token' },
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });
});
