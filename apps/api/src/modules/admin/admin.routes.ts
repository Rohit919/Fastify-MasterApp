import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { PermissionKeys } from '@app/api-contracts';
import { requirePermission } from '@core/authorization/index.js';

/**
 * Admin-only diagnostics. Protected by JWT auth + the metrics.read permission
 * (granted to ADMIN/SUPER_ADMIN by the seed).
 */
const adminRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // ── GET /admin/db-metrics ────────────────────────────────────────────────────
  // Prisma client metrics: connection pool gauges + query counters. Useful for
  // spotting pool exhaustion and query-volume regressions.
  fastify.get(
    '/db-metrics',
    {
      preValidation: [fastify.authenticate],
      preHandler: [requirePermission(PermissionKeys.MetricsRead)],
      schema: {
        description: 'Prisma client metrics (admin only)',
        tags: ['Admin'],
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
        fastify.prisma as unknown as { $metrics: { json: () => Promise<unknown> } }
      ).$metrics.json();
      return reply.send({ success: true, data: metrics });
    }
  );
};

export default adminRoutes;
