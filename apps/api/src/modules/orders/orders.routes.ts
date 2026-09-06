import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

/**
 * PLACEHOLDER — orders routes.
 *
 * Not yet registered in app.ts. When ready:
 *   1. Add a Prisma Order model + migration.
 *   2. Implement operations/, repositories/, and the orchestrator.
 *   3. Register here with the authenticate preHandler and TypeBox schemas.
 *   4. Register in app.ts: fastify.register(orderRoutes, { prefix: '/orders' })
 */
// eslint-disable-next-line @typescript-eslint/require-await
const orderRoutes: FastifyPluginAsyncTypebox = async (_fastify) => {
  // Routes will be defined here.
};

export default orderRoutes;
