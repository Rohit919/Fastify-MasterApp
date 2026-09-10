import { describe, it, expect, vi } from "vitest";
import type { FastifyRequest } from "fastify";
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
} from "../require-permission.js";
import { PermissionKeys } from "@app/api-contracts";

function makeRequest(opts: {
  userId?: string | null;
  permissions: string[];
}): FastifyRequest {
  const authenticatedId =
    opts.userId === null ? undefined : (opts.userId ?? "u1");
  const ctx = {
    userId: authenticatedId ?? "",
    roles: [],
    permissions: opts.permissions,
  };
  return {
    user: authenticatedId === undefined ? undefined : { id: authenticatedId },
    id: "req-1",
    url: "/x",
    routeOptions: { url: "/x" },
    log: { warn: vi.fn() },
    server: {
      authorization: { getContextForRequest: vi.fn().mockResolvedValue(ctx) },
    },
  } as unknown as FastifyRequest;
}

async function expectStatus(run: () => Promise<void>, statusCode: number) {
  await expect(run()).rejects.toMatchObject({ statusCode });
}

describe("requirePermission", () => {
  it("401 when unauthenticated", () =>
    expectStatus(
      () =>
        requirePermission(PermissionKeys.UsersRead)(
          makeRequest({ userId: null, permissions: [] }),
        ),
      401,
    ));
  it("allows when the permission is present", async () => {
    await expect(
      requirePermission(PermissionKeys.UsersRead)(
        makeRequest({ permissions: [PermissionKeys.UsersRead] }),
      ),
    ).resolves.toBeUndefined();
  });
  it("403 when the permission is missing", () =>
    expectStatus(
      () =>
        requirePermission(PermissionKeys.UsersDelete)(
          makeRequest({ permissions: [PermissionKeys.UsersRead] }),
        ),
      403,
    ));
});

describe("requireAnyPermission", () => {
  it("allows when at least one permission matches", async () => {
    await expect(
      requireAnyPermission([
        PermissionKeys.UsersDelete,
        PermissionKeys.UsersRead,
      ])(makeRequest({ permissions: [PermissionKeys.UsersRead] })),
    ).resolves.toBeUndefined();
  });
  it("403 when none match", () =>
    expectStatus(
      () =>
        requireAnyPermission([
          PermissionKeys.UsersDelete,
          PermissionKeys.RolesDelete,
        ])(makeRequest({ permissions: [PermissionKeys.UsersRead] })),
      403,
    ));
  it("401 when unauthenticated", () =>
    expectStatus(
      () =>
        requireAnyPermission([PermissionKeys.UsersRead])(
          makeRequest({ userId: null, permissions: [] }),
        ),
      401,
    ));
});

describe("requireAllPermissions", () => {
  it("allows when all permissions are present", async () => {
    await expect(
      requireAllPermissions([
        PermissionKeys.UsersRead,
        PermissionKeys.RolesRead,
      ])(
        makeRequest({
          permissions: [PermissionKeys.UsersRead, PermissionKeys.RolesRead],
        }),
      ),
    ).resolves.toBeUndefined();
  });
  it("403 when one is missing", () =>
    expectStatus(
      () =>
        requireAllPermissions([
          PermissionKeys.UsersRead,
          PermissionKeys.RolesRead,
        ])(makeRequest({ permissions: [PermissionKeys.UsersRead] })),
      403,
    ));
  it("401 when unauthenticated", () =>
    expectStatus(
      () =>
        requireAllPermissions([PermissionKeys.UsersRead])(
          makeRequest({ userId: null, permissions: [] }),
        ),
      401,
    ));
});
