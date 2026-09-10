import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  EXAMPLE_CONTRACTS,
  toFastifySchema,
  type CreateExampleBody,
} from "@app/api-contracts";

/**
 * Example module — demonstrates DIRECT Prisma access for simple CRUD.
 * Contrast with the todos module which uses the Golden Orchestrator pattern.
 * Consumes the shared Level 2 contracts (EXAMPLE_CONTRACTS); registration paths
 * are relative to the `/examples` module prefix.
 */
const exampleRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // ── GET / ────────────────────────────────────────────────────────────────────
  fastify.get(
    "/",
    {
      preValidation: [fastify.authenticate],
      schema: toFastifySchema(EXAMPLE_CONTRACTS.LIST),
    },
    async (_request, reply) => {
      const examples = await fastify.prisma.example.findMany({
        orderBy: { createdAt: "desc" },
      });
      return reply.send({
        success: true,
        data: examples.map((ex) => ({
          ...ex,
          createdAt: ex.createdAt.toISOString(),
          updatedAt: ex.updatedAt.toISOString(),
        })),
      });
    },
  );

  // ── POST / ───────────────────────────────────────────────────────────────────
  fastify.post(
    "/",
    {
      preValidation: [fastify.authenticate],
      schema: toFastifySchema(EXAMPLE_CONTRACTS.CREATE),
    },
    async (request, reply) => {
      const { title, description } = request.body as CreateExampleBody;
      const example = await fastify.prisma.example.create({
        data: { title, description },
      });
      return reply.status(201).send({
        success: true,
        data: {
          ...example,
          createdAt: example.createdAt.toISOString(),
          updatedAt: example.updatedAt.toISOString(),
        },
      });
    },
  );
};

export default exampleRoutes;
