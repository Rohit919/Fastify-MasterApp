import type { PrismaClient } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import {
  isPermissionKey,
  SystemRoles,
  type PermissionKey,
} from "@app/api-contracts";
import type { AuthorizationContext } from "./authorization.types.js";

/**
 * AuthorizationService — the single place that resolves what an authenticated
 * user is allowed to do. Route handlers and preHandlers ask this service; they
 * never query roles/permissions directly.
 *
 * Resolution: user → user_roles → roles → role_permissions → permissions,
 * effective permissions = the union across all assigned roles.
 *
 * Caching: this implementation resolves from the database. A short-lived
 * per-REQUEST cache lives on `request` (see getContextForRequest) so a single
 * request that performs multiple checks hits the DB once. A distributed Redis
 * cache can be layered later behind this same interface; invalidation would key
 * off the user's permissionVersion.
 */
export class AuthorizationService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Resolve the full authorization context for a user id. */
  async getContext(userId: string): Promise<AuthorizationContext> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            name: true,
            permissions: { select: { permission: { select: { key: true } } } },
          },
        },
      },
    });

    const roles: string[] = [];
    const permissionSet = new Set<PermissionKey>();

    for (const row of rows) {
      roles.push(row.role.name);
      for (const rp of row.role.permissions) {
        // Default-deny hardening: only surface keys that exist in the registry.
        // An unknown key in the DB never becomes an effective permission.
        if (isPermissionKey(rp.permission.key)) {
          permissionSet.add(rp.permission.key);
        }
      }
    }

    return {
      userId,
      roles,
      permissions: [...permissionSet],
    };
  }

  /** True if the user holds the given permission. Default-deny. */
  async hasPermission(
    userId: string,
    permission: PermissionKey,
  ): Promise<boolean> {
    const ctx = await this.getContext(userId);
    return ctx.permissions.includes(permission);
  }

  /** True if the user holds ANY of the given permissions. */
  async hasAnyPermission(
    userId: string,
    permissions: PermissionKey[],
  ): Promise<boolean> {
    const ctx = await this.getContext(userId);
    return permissions.some((p) => ctx.permissions.includes(p));
  }

  /** True if the user holds ALL of the given permissions. */
  async hasAllPermissions(
    userId: string,
    permissions: PermissionKey[],
  ): Promise<boolean> {
    const ctx = await this.getContext(userId);
    return permissions.every((p) => ctx.permissions.includes(p));
  }

  /** True if the user is assigned the platform break-glass SUPER_ADMIN role. */
  async isSuperAdmin(userId: string): Promise<boolean> {
    const ctx = await this.getContext(userId);
    return ctx.roles.includes(SystemRoles.SuperAdmin);
  }

  /**
   * Resolve (and memoize on the request) the authorization context. Multiple
   * permission checks in one request share a single DB lookup.
   */
  async getContextForRequest(
    request: FastifyRequest,
  ): Promise<AuthorizationContext> {
    if (request.authz) return request.authz;
    const userId = request.user?.id;
    if (!userId) {
      // No identity → empty context (default deny).
      return { userId: "", roles: [], permissions: [] };
    }
    const ctx = await this.getContext(userId);
    request.authz = ctx;
    return ctx;
  }
}

// Attach the resolved context to the request object for per-request memoization.
declare module "fastify" {
  interface FastifyRequest {
    authz?: AuthorizationContext;
  }
}
