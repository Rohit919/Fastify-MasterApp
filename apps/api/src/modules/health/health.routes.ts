import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

const healthRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // ── GET /health (liveness) ──────────────────────────────────────────────────
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Liveness probe — checks the Node.js process is responsive',
        tags: ['Health'],
        response: {
          200: Type.Object({
            status: Type.Literal('ok'),
            timestamp: Type.String(),
            uptime: Type.Number(),
            environment: Type.String(),
          }),
        },
      },
    },
    async (_request, reply) => {
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV ?? 'development',
      });
    }
  );

  // ── GET /ready (readiness) ──────────────────────────────────────────────────
  fastify.get(
    '/ready',
    {
      schema: {
        description: 'Readiness probe — verifies database connectivity before routing traffic',
        tags: ['Health'],
        response: {
          200: Type.Object({
            status: Type.Union([Type.Literal('ready'), Type.Literal('degraded')]),
            services: Type.Object({
              database: Type.Boolean(),
            }),
            timestamp: Type.String(),
          }),
          503: Type.Object({
            status: Type.Literal('not_ready'),
            services: Type.Object({
              database: Type.Boolean(),
            }),
            timestamp: Type.String(),
          }),
        },
      },
    },
    async (_request, reply) => {
      let isDatabaseReady = false;

      try {
        await fastify.prisma.$queryRaw`SELECT 1`;
        isDatabaseReady = true;
      } catch (err) {
        fastify.log.error({ err }, 'Database readiness check failed');
      }

      const status = isDatabaseReady ? 'ready' : 'not_ready';
      const statusCode = isDatabaseReady ? 200 : 503;

      return reply.status(statusCode).send({
        status,
        services: { database: isDatabaseReady },
        timestamp: new Date().toISOString(),
      });
    }
  );
};

export default healthRoutes;
