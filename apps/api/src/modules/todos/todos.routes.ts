import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { TODO_CONTRACTS, toFastifySchema, type CreateTodoBody } from '@app/api-contracts';
import { requireRolePermission, requireOwnership } from '@core/authorization/index.js';
import { ValidationError } from '@core/errors/index.js';
import { TodoService } from './todos.service.js';

/**
 * Todos module routes — demonstrates the Golden Orchestrator pattern.
 * Route → Service → Orchestrator → Operations (validate → create → notify).
 * Schemas/metadata come from the shared TODO_CONTRACTS; registration paths are
 * relative to the `/todos` module prefix.
 */
const todoRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // Pass the notifications queue when available (absent in test harness).
  const todoService = new TodoService(fastify.prisma, fastify.queues?.notifications);

  // ── POST / (orchestrated create) ─────────────────────────────────────────────
  fastify.post(
    '/',
    {
      preValidation: [fastify.authenticate],
      schema: toFastifySchema(TODO_CONTRACTS.CREATE),
    },
    async (request, reply) => {
      const body = request.body as CreateTodoBody;
      const result = await todoService.createTodo(
        {
          title: body.title,
          description: body.description,
          userId: request.user.id,
        },
        request.log as unknown as import('pino').Logger
      );

      if (!result.success) {
        // Route through the global handler for the canonical error envelope
        // with a stable code (API_CONVENTIONS §39).
        throw new ValidationError(result.error?.message ?? 'Failed to create todo');
      }

      return reply.status(201).send({
        success: true,
        data: {
          ...result.data!,
          description: result.data!.description ?? '',
          createdAt: result.data!.createdAt.toISOString(),
          updatedAt: result.data!.updatedAt.toISOString(),
        },
        metadata: {
          duration: result.duration,
          metrics: result.metrics,
        },
      });
    }
  );

  // ── GET /health ──────────────────────────────────────────────────────────────
  fastify.get(
    '/health',
    {
      schema: toFastifySchema(TODO_CONTRACTS.HEALTH),
    },
    async (_request, reply) => {
      const health = await todoService.healthCheck();
      return reply.send(health);
    }
  );

  // ── GET / (list) ─────────────────────────────────────────────────────────────
  fastify.get(
    '/',
    {
      preValidation: [fastify.authenticate],
      schema: toFastifySchema(TODO_CONTRACTS.LIST),
    },
    async (request, reply) => {
      const todos = await fastify.prisma.todo.findMany({
        where: { userId: request.user.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, description: true, completed: true },
      });

      return reply.send({
        success: true,
        data: todos.map((todo) => ({ ...todo, description: todo.description ?? '' })),
      });
    }
  );

  // ── GET /:id ─── RBAC + ownership demonstration ─────────────────────────────
  // requireRolePermission gates by role; requireOwnership ensures a 'user' can
  // only read their own todo (admins bypass ownership).
  fastify.get(
    '/:id',
    {
      preValidation: [fastify.authenticate],
      preHandler: [
        requireRolePermission('todo', 'read'),
        requireOwnership(async (req) => {
          const { id } = req.params as { id: string };
          const todo = await fastify.prisma.todo.findUnique({
            where: { id },
            select: { userId: true },
          });
          return todo?.userId;
        }),
      ],
      schema: toFastifySchema(TODO_CONTRACTS.GET_BY_ID),
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const todo = await fastify.prisma.todo.findUnique({
        where: { id },
        select: { id: true, title: true, description: true, completed: true },
      });
      // Ownership preHandler already guaranteed existence + access.
      return reply.send({
        success: true,
        data: { ...todo!, description: todo!.description ?? '' },
      });
    }
  );
};

export default todoRoutes;
