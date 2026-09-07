import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  ListExamplesResponseSchema,
  CreateExampleBodySchema,
  CreateExampleResponseSchema,
} from './example.schemas.js';

/**
 * Example module — demonstrates DIRECT Prisma access for simple CRUD.
 * Contrast with the todos module which uses the Golden Orchestrator pattern.
 * Use direct access when there is no complex business logic.
 */
const exampleRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // ── GET / ────────────────────────────────────────────────────────────────────
  fastify.get(
    '/',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'List all examples',
        tags: ['Example'],
        security: [{ bearerAuth: [] }],
        response: { 200: ListExamplesResponseSchema },
      },
    },
    async (_request, reply) => {
      const examples = await fastify.prisma.example.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({
        success: true,
        data: examples.map((ex) => ({
          ...ex,
          createdAt: ex.createdAt.toISOString(),
          updatedAt: ex.updatedAt.toISOString(),
        })),
      });
    }
  );

  // ── POST / ───────────────────────────────────────────────────────────────────
  fastify.post(
    '/',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Create a new example',
        tags: ['Example'],
        security: [{ bearerAuth: [] }],
        body: CreateExampleBodySchema,
        response: { 201: CreateExampleResponseSchema },
      },
    },
    async (request, reply) => {
      const { title, description } = request.body;
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
    }
  );
};

export default exampleRoutes;
