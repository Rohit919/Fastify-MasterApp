import { describe, it, expect, vi } from 'vitest';
import { buildTestApp, signTestToken } from '@core/testing/test-app.js';

const BASE = '/api/v1/todos';

const OWNER_ID = 'user-test-id'; // matches signTestToken default
const OTHERS_TODO = {
  userId: 'someone-else',
  id: 'todo-x',
  title: 'Theirs',
  description: 'd',
  completed: false,
};
const OWN_TODO = {
  userId: OWNER_ID,
  id: 'todo-own',
  title: 'Mine',
  description: 'd',
  completed: false,
};

describe('GET /api/v1/todos/:id — RBAC + ownership', () => {
  it('lets a user read their OWN todo (200)', async () => {
    const app = await buildTestApp({
      prisma: { todo: { findUnique: vi.fn().mockResolvedValue(OWN_TODO) } },
    });
    const token = signTestToken(app); // role: user, id: user-test-id
    const res = await app.inject({
      method: 'GET',
      url: `${BASE}/todo-own`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("forbids a user reading someone else's todo (403)", async () => {
    const app = await buildTestApp({
      prisma: { todo: { findUnique: vi.fn().mockResolvedValue(OTHERS_TODO) } },
    });
    const token = signTestToken(app);
    const res = await app.inject({
      method: 'GET',
      url: `${BASE}/todo-x`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('lets an admin read any todo (200)', async () => {
    const app = await buildTestApp({
      prisma: { todo: { findUnique: vi.fn().mockResolvedValue(OTHERS_TODO) } },
    });
    const token = signTestToken(app, { id: 'admin-1', email: 'a@x.com', role: 'admin' });
    const res = await app.inject({
      method: 'GET',
      url: `${BASE}/todo-x`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('returns 404 when the todo does not exist', async () => {
    const app = await buildTestApp({
      prisma: { todo: { findUnique: vi.fn().mockResolvedValue(null) } },
    });
    const token = signTestToken(app);
    const res = await app.inject({
      method: 'GET',
      url: `${BASE}/missing`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
