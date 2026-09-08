import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { getTenantDb } from "../tenant-db.js";

/**
 * The explicit accessor must thread tenantId into every tenant-owned query —
 * where-clauses for reads/updates/deletes, and data for creates.
 */

function makePrisma() {
  const todo = {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "t" }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    count: vi.fn().mockResolvedValue(0),
  };
  return { prisma: { todo } as unknown as PrismaClient, todo };
}

describe("getTenantDb (todo accessor)", () => {
  it("injects tenantId into findMany where", async () => {
    const { prisma, todo } = makePrisma();
    await getTenantDb(prisma, "tenant-a").todo.findMany({
      where: { completed: true },
    });

    expect(todo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { completed: true, tenantId: "tenant-a" },
      }),
    );
  });

  it("uses findFirst (never findUnique) and scopes by tenant for single reads", async () => {
    const { prisma, todo } = makePrisma();
    await getTenantDb(prisma, "tenant-a").todo.findOne({ where: { id: "x" } });

    expect(todo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "x", tenantId: "tenant-a" } }),
    );
  });

  it("injects tenantId into create data", async () => {
    const { prisma, todo } = makePrisma();
    await getTenantDb(prisma, "tenant-a").todo.create({
      title: "x",
      userId: "u1",
    });

    expect(todo.create).toHaveBeenCalledWith({
      data: { title: "x", userId: "u1", tenantId: "tenant-a" },
    });
  });

  it("scopes updateMany and deleteMany by tenant", async () => {
    const { prisma, todo } = makePrisma();
    const db = getTenantDb(prisma, "tenant-a");
    await db.todo.updateMany({ where: { id: "x" }, data: { completed: true } });
    await db.todo.deleteMany({ id: "x" });

    expect(todo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "x", tenantId: "tenant-a" } }),
    );
    expect(todo.deleteMany).toHaveBeenCalledWith({
      where: { id: "x", tenantId: "tenant-a" },
    });
  });

  it("exposes the bound tenantId", () => {
    const { prisma } = makePrisma();
    expect(getTenantDb(prisma, "tenant-a").tenantId).toBe("tenant-a");
  });
});
