import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usersApi } from "@/modules/users/api/users.api";
import { apiClient } from "@/lib/api-client";

describe("usersApi role assignment", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("getRoles calls the admin user-roles endpoint and returns the roles array", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ userId: "u1", roles: ["ADMIN", "MANAGER"] });

    const roles = await usersApi.getRoles("u1");

    expect(roles).toEqual(["ADMIN", "MANAGER"]);
    expect(get).toHaveBeenCalledWith("/api/v1/admin/users/u1/roles");
  });

  it("setRoles PUTs the new role set to the correct endpoint", async () => {
    const put = vi
      .spyOn(apiClient, "put")
      .mockResolvedValue({ userId: "u1", roles: ["SUPPORT"] });

    const roles = await usersApi.setRoles("u1", ["SUPPORT"]);

    expect(roles).toEqual(["SUPPORT"]);
    expect(put).toHaveBeenCalledWith("/api/v1/admin/users/u1/roles", {
      roles: ["SUPPORT"],
    });
  });

  it("list forwards pagination + filter query params via the contract request", async () => {
    const request = vi
      .spyOn(apiClient, "request")
      .mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      });

    await usersApi.list({
      page: 2,
      pageSize: 10,
      search: "ann",
      role: "admin",
    });

    expect(request).toHaveBeenCalledTimes(1);
    const [, args] = request.mock.calls[0];
    expect(args?.query).toMatchObject({
      page: 2,
      pageSize: 10,
      search: "ann",
      role: "admin",
    });
  });
});

const profile = {
  id: "u1",
  email: "a@b.c",
  name: "Alice",
  role: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("usersApi CRUD", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("create POSTs to /users", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue(profile);
    const body = {
      email: "a@b.c",
      name: "Alice",
      password: "password123",
      role: "user" as const,
    };
    const res = await usersApi.create(body);
    expect(res).toEqual(profile);
    expect(post).toHaveBeenCalledWith("/api/v1/users", body);
  });

  it("get fetches /users/:id", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue(profile);
    await usersApi.get("u1");
    expect(get).toHaveBeenCalledWith("/api/v1/users/u1");
  });

  it("update PATCHes /users/:id", async () => {
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ ...profile, name: "Renamed" });
    const res = await usersApi.update("u1", { name: "Renamed" });
    expect(res.name).toBe("Renamed");
    expect(patch).toHaveBeenCalledWith("/api/v1/users/u1", { name: "Renamed" });
  });

  it("remove DELETEs /users/:id", async () => {
    const del = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue({ message: "User deleted" });
    const res = await usersApi.remove("u1");
    expect(res.message).toMatch(/deleted/i);
    expect(del).toHaveBeenCalledWith("/api/v1/users/u1");
  });

  it("updateProfile PATCHes /users/me (self)", async () => {
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ ...profile, name: "Me" });
    await usersApi.updateProfile({ name: "Me" });
    expect(patch).toHaveBeenCalledWith("/api/v1/users/me", { name: "Me" });
  });
});
