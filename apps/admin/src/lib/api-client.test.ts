import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { useAuthStore } from "@/stores/auth.store";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client session refresh", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "expired", initialized: true });
    vi.restoreAllMocks();
  });

  it("refreshes once after a 401 and retries with the new token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({ success: false, error: { message: "expired" } }, 401),
      )
      .mockResolvedValueOnce(
        response({ success: true, data: { accessToken: "fresh" } }),
      )
      .mockResolvedValueOnce(response({ success: true, data: { ok: true } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiClient.get<{ ok: boolean }>("/api/v1/test"),
    ).resolves.toEqual({ ok: true });
    expect(useAuthStore.getState().accessToken).toBe("fresh");
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer fresh",
    });
  });
});
