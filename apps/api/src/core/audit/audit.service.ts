import type { PrismaClient, Prisma } from "@/generated/prisma/client.js";
import type { FastifyRequest } from "fastify";

/**
 * Audit actions for authorization-relevant changes. Stable string constants so
 * downstream consumers (SIEM, reports) can filter reliably.
 */
export const AuditActions = {
  RoleCreated: "ROLE_CREATED",
  RoleUpdated: "ROLE_UPDATED",
  RoleDeleted: "ROLE_DELETED",
  RoleAssigned: "ROLE_ASSIGNED",
  RoleRemoved: "ROLE_REMOVED",
  RolePermissionsUpdated: "ROLE_PERMISSIONS_UPDATED",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

export interface AuditEntry {
  action: AuditAction | string;
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Records high-value authorization changes. Never store secrets in metadata.
 *
 * `record` accepts an optional Prisma transaction client so an audit row can be
 * written in the SAME transaction as the change it describes — the audit record
 * and the mutation commit or roll back together.
 */
export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async record(
    entry: AuditEntry,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: (entry.metadata ?? undefined) as
          Prisma.InputJsonValue | undefined,
        requestId: entry.requestId ?? null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  }

  /** Pull the request-scoped audit fields (actor, requestId, ip, userAgent). */
  static contextFrom(
    request: FastifyRequest,
  ): Pick<AuditEntry, "actorId" | "requestId" | "ip" | "userAgent"> {
    return {
      actorId: request.user?.id ?? null,
      requestId: request.id,
      ip: request.ip,
      userAgent: request.headers["user-agent"] ?? null,
    };
  }
}
