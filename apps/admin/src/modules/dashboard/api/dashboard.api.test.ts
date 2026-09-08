import { afterEach, describe, expect, it, vi } from "vitest";
import { getDashboardMetrics } from "@/modules/dashboard/api/dashboard.api";
import { apiClient, ApiError } from "@/lib/api-client";
import { usersApi } from "@/modules/users/api/users.api";
import { rolesApi, permissionsApi } from "@/modules/roles/api/roles.api";

afterEach(() => vi.restoreAllMocks());

describe("getDashboardMetrics", () => {
  it("maps the live /admin/dashboard response (no placeholders)", async () => {
    vi.spyOn(apiClient, "request").mockResolvedValue({
      data: {
        totals: { users: 42, roles: 5, permissions: 26 },
        recentUsers: [
          {
            id: "u1",
            name: "Alice",
            email: "a@x.io",
            role: "admin",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        signups: [
          { date: "2026-01-01", count: 2 },
          { date: "2026-01-02", count: 3 },
        ],
      },
    });

    const m = await getDashboardMetrics();
    expect(m.totalUsers).toBe(42);
    expect(m.usesPlaceholders).toBe(false);
    expect(m.recentUsers).toHaveLength(1);
    expect(m.signups).toHaveLength(2);
    expect(m.signups[0].count).toBe(2);
  });

  it("falls back to derived counts on 403 (metrics.read denied)", async () => {
    vi.spyOn(apiClient, "request").mockRejectedValue(
      new ApiError("no", 403, undefined, "FORBIDDEN"),
    );
    vi.spyOn(usersApi, "list").mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 1, total: 7, totalPages: 7 },
    });
    vi.spyOn(rolesApi, "list").mockResolvedValue([]);
    vi.spyOn(permissionsApi, "list").mockResolvedValue([]);

    const m = await getDashboardMetrics();
    expect(m.usesPlaceholders).toBe(true);
    expect(m.totalUsers).toBe(7);
    expect(m.signups).toEqual([]);
    expect(m.recentUsers).toEqual([]);
  });

  it("re-throws non-permission errors (real error state)", async () => {
    vi.spyOn(apiClient, "request").mockRejectedValue(
      new ApiError("boom", 500, undefined, "INTERNAL_ERROR"),
    );
    await expect(getDashboardMetrics()).rejects.toBeInstanceOf(ApiError);
  });
});
