import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  AUDIT_CONTRACTS,
  PermissionKeys,
  toFastifySchema,
  type ListAuditLogsQuery,
} from "@app/api-contracts";
import { normalizePagination, buildPageMeta } from "@core/utils/index.js";
import { requirePermission } from "@core/authorization/index.js";

/**
 * Admin-only diagnostics. Protected by JWT auth + the metrics.read permission
 * (granted to ADMIN/SUPER_ADMIN by the seed).
 */
const adminRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // ── GET /admin/db-metrics ────────────────────────────────────────────────────
  // Prisma client metrics: connection pool gauges + query counters. Useful for
  // spotting pool exhaustion and query-volume regressions.
  fastify.get(
    "/db-metrics",
    {
      preValidation: [fastify.authenticate],
      preHandler: [requirePermission(PermissionKeys.MetricsRead)],
      schema: {
        description: "Prisma client metrics (admin only)",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Unknown(),
          }),
        },
      },
    },
    async (_request, reply) => {
      // $metrics is enabled by previewFeatures = ["metrics"] in schema.prisma.
      const metrics = await (
        fastify.prisma as unknown as {
          $metrics: { json: () => Promise<unknown> };
        }
      ).$metrics.json();
      return reply.send({ success: true, data: metrics });
    },
  );

  fastify.get(
    "/audit-logs",
    {
      preValidation: [fastify.authenticate],
      preHandler: [requirePermission(PermissionKeys.AuditRead)],
      schema: toFastifySchema(AUDIT_CONTRACTS.LIST),
    },
    async (request, reply) => {
      const query = request.query as ListAuditLogsQuery;
      const { page, pageSize, skip, take } = normalizePagination(query);
      const where = {
        ...(query.action ? { action: query.action } : {}),
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.targetId ? { targetId: query.targetId } : {}),
      };
      const [rows, total] = await Promise.all([
        fastify.prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        fastify.prisma.auditLog.count({ where }),
      ]);
      return reply.send({
        success: true,
        data: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
        meta: buildPageMeta(page, pageSize, total),
      });
    },
  );
};

export default adminRoutes;
