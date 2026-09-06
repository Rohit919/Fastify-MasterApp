import { describe, it, expect, vi } from 'vitest';
import { buildTestApp, signTestToken } from '@utils/test-app.js';

const BASE_URL = '/api/v1/todos';

const MOCK_TODO = {
  id: 'todo-test-id',
  title: 'Buy milk',
  description: 'Whole milk please',
  completed: false,
  userId: 'user-test-id',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── POST /todos ──────────────────────────────────────────────────────────────

describe('POST /api/v1/todos', () => {
  it('returns 201 with created todo and metrics on success', async () => {
    const app = await buildTestApp({
      prisma: {
        todo: {
          create: vi.fn().mockResolvedValue(MOCK_TODO),
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    const token = signTestToken(app);

    const res = await app.inject({
      method: 'POST',
      url: BASE_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Buy milk', description: 'Whole milk please' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Buy milk');
    expect(body.data.completed).toBe(false);
    expect(body.data).not.toHaveProperty('password');
    // Orchestrator performance metadata is returned
    expect(body.metadata).toBeDefined();
    expect(body.metadata.duration).toBeTypeOf('number');

    await app.close();
  });

  it('returns 401 when no auth token is provided', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: BASE_URL,
      payload: { title: 'Buy milk', description: 'desc' },
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns 400 for an empty title', async () => {
    const app = await buildTestApp({
      prisma: {
        todo: {
          create: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    const token = signTestToken(app);

    const res = await app.inject({
      method: 'POST',
      url: BASE_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '', description: 'some desc' },
    });

    // TypeBox schema rejects minLength:1 violation before the handler runs
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 when title is missing from the body', async () => {
    const app = await buildTestApp();
    const token = signTestToken(app);

    const res = await app.inject({
      method: 'POST',
      url: BASE_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: { description: 'no title here' },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 when title exceeds 200 characters', async () => {
    const app = await buildTestApp({
      prisma: {
        todo: {
          create: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    const token = signTestToken(app);

    const res = await app.inject({
      method: 'POST',
      url: BASE_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'a'.repeat(201), description: 'desc' },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
  });
});

// ─── GET /todos ───────────────────────────────────────────────────────────────

describe('GET /api/v1/todos', () => {
  it('returns 200 with an array of todos for the authenticated user', async () => {
    const findManyMock = vi.fn().mockResolvedValue([
      { id: 'todo-1', title: 'First', description: 'desc', completed: false },
      { id: 'todo-2', title: 'Second', description: null, completed: true },
    ]);

    const app = await buildTestApp({
      prisma: {
        todo: {
          findMany: findManyMock,
          create: vi.fn(),
        },
      },
    });

    const token = signTestToken(app);

    const res = await app.inject({
      method: 'GET',
      url: BASE_URL,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].title).toBe('First');
    // null description is coerced to empty string by the route
    expect(body.data[1].description).toBe('');

    // Should only query todos for the current user
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-test-id' } })
    );

    await app.close();
  });

  it('returns 200 with empty array when user has no todos', async () => {
    const app = await buildTestApp({
      prisma: {
        todo: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn(),
        },
      },
    });

    const token = signTestToken(app);

    const res = await app.inject({
      method: 'GET',
      url: BASE_URL,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(0);

    await app.close();
  });

  it('returns 401 when no auth token is provided', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: BASE_URL,
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

// ─── GET /todos/health ────────────────────────────────────────────────────────

describe('GET /api/v1/todos/health', () => {
  it('returns 200 with service health status (no auth required)', async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: `${BASE_URL}/health`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('TodoService');

    await app.close();
  });
});
