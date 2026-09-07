import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const originalFetch = global.fetch;

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'access-1', user: null, roles: [], permissions: [] });
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('apiClient success + envelope unwrapping', () => {
  it('unwraps { success, data } for get()', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { success: true, data: { id: '1' } })
    ) as unknown as typeof fetch;

    const data = await apiClient.get<{ id: string }>('/api/v1/thing');
    expect(data).toEqual({ id: '1' });
  });

  it('attaches the bearer token on authenticated requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: {} }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await apiClient.get('/api/v1/thing');

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer access-1');
  });
});

describe('apiClient 401 handling (session expiry / refresh)', () => {
  it('refreshes the token once on 401, then retries and succeeds', async () => {
    const fetchMock = vi
      .fn()
      // 1) original request → 401
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: 'x' } }))
      // 2) refresh → new token
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { accessToken: 'access-2' } }))
      // 3) retry → success
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ok: true } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const data = await apiClient.get<{ ok: boolean }>('/api/v1/thing');

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // Token was rotated by the refresh flow.
    expect(useAuthStore.getState().accessToken).toBe('access-2');
  });

  it('clears the session when refresh fails', async () => {
    // jsdom navigation is a no-op; spy so the client can "redirect" safely.
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard', assign },
      writable: true,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'TOKEN_EXPIRED', message: 'x' } }))
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'TOKEN_INVALID', message: 'x' } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiClient.get('/api/v1/thing')).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });
});

describe('apiClient error normalization', () => {
  it('throws a typed ApiError carrying code + requestId', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse(409, { error: { code: 'CONFLICT', message: 'dup', requestId: 'req-9' } })
    ) as unknown as typeof fetch;

    await expect(apiClient.post('/api/v1/thing', {}, true)).rejects.toMatchObject({
      code: 'CONFLICT',
      statusCode: 409,
      requestId: 'req-9',
    });
  });

  it('surfaces a TIMEOUT ApiError when the request aborts', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      const err = new DOMException('aborted', 'AbortError');
      return Promise.reject(err);
    }) as unknown as typeof fetch;

    await expect(apiClient.get('/api/v1/slow')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('normalizes a generic network failure to NETWORK_ERROR', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    await expect(apiClient.get('/api/v1/thing', )).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
