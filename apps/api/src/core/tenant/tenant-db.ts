import type { PrismaClient, Prisma } from "@prisma/client";

/**
 * Explicit tenant-scoped database accessor (MULTI-TENANT-ARCHITECTURE §24, §59).
 *
 * This is the ONLY sanctioned way to read/write tenant-owned data. It threads
 * the active `tenantId` into every query so a developer cannot forget it, and —
 * critically — it does so EXPLICITLY (no hidden Prisma middleware rewriting
 * queries). Platform / Super-Admin operations deliberately bypass this and use
 * the raw `prisma` client directly, so they are never silently tenant-filtered.
 *
 * Usage:
 *   const db = getTenantDb(fastify.prisma, request.tenant.tenantId);
 *   await db.todo.findMany();                 // auto-scoped to the tenant
 *   await db.todo.create({ title, userId });  // tenantId injected
 *
 * Design: rather than a generic proxy, we expose a small, typed surface per
 * tenant-owned model. Add a model here when it becomes tenant-owned (and to
 * TENANT_OWNED_MODELS). The explicitness is the point — each method shows
 * exactly how tenantId is applied.
 */
export interface TenantDb {
  readonly tenantId: string;
  readonly todo: TenantTodoAccessor;
  readonly auditLog: TenantAuditLogAccessor;
}

interface TenantTodoAccessor {
  findMany(
    args?: Omit<Prisma.TodoFindManyArgs, "where"> & {
      where?: Prisma.TodoWhereInput;
    },
  ): Promise<unknown[]>;
  /** Tenant-safe single-record read: findFirst scoped to the tenant (never findUnique by id). */
  findOne(
    args: Omit<Prisma.TodoFindFirstArgs, "where"> & {
      where: Prisma.TodoWhereInput;
    },
  ): Promise<unknown | null>;
  create(
    data: Omit<Prisma.TodoUncheckedCreateInput, "tenantId">,
  ): Promise<unknown>;
  updateMany(args: {
    where: Prisma.TodoWhereInput;
    data: Prisma.TodoUpdateManyMutationInput;
  }): Promise<Prisma.BatchPayload>;
  deleteMany(where: Prisma.TodoWhereInput): Promise<Prisma.BatchPayload>;
  count(where?: Prisma.TodoWhereInput): Promise<number>;
}

interface TenantAuditLogAccessor {
  findMany(
    args?: Omit<Prisma.AuditLogFindManyArgs, "where"> & {
      where?: Prisma.AuditLogWhereInput;
    },
  ): Promise<unknown[]>;
  create(
    data: Omit<Prisma.AuditLogUncheckedCreateInput, "tenantId">,
  ): Promise<unknown>;
  count(where?: Prisma.AuditLogWhereInput): Promise<number>;
}

/**
 * Build a tenant-scoped accessor bound to a single tenant. The returned object
 * applies `tenantId` to every where-clause and create payload.
 */
export function getTenantDb(prisma: PrismaClient, tenantId: string): TenantDb {
  const scope = { tenantId };

  return {
    tenantId,

    todo: {
      findMany: (args = {}) =>
        prisma.todo.findMany({ ...args, where: { ...args.where, ...scope } }),
      findOne: (args) =>
        prisma.todo.findFirst({ ...args, where: { ...args.where, ...scope } }),
      create: (data) => prisma.todo.create({ data: { ...data, ...scope } }),
      updateMany: ({ where, data }) =>
        prisma.todo.updateMany({ where: { ...where, ...scope }, data }),
      deleteMany: (where) =>
        prisma.todo.deleteMany({ where: { ...where, ...scope } }),
      count: (where = {}) =>
        prisma.todo.count({ where: { ...where, ...scope } }),
    },

    auditLog: {
      findMany: (args = {}) =>
        prisma.auditLog.findMany({
          ...args,
          where: { ...args.where, ...scope },
        }),
      create: (data) => prisma.auditLog.create({ data: { ...data, ...scope } }),
      count: (where = {}) =>
        prisma.auditLog.count({ where: { ...where, ...scope } }),
    },
  };
}
