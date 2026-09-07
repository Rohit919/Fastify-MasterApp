import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { requirePermission, requireOwnership } from '@core/authorization/index.js';
import { TodoService } from './todos.service.js';
import {
  CreateTodoBodySchema,
  CreateTodoResponseSchema,
  ListTodosResponseSchema,
  TodoHealthResponseSchema,
} from './todos.schemas.js';

/**
 * Todos module routes — demonstrates the Golden Orchestrator pattern.
 * Route → Service → Orchestrator → Operations (validate → create → notify)
 */
const todoRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // Pass the notifications queue when available (absent in test harness).
  const todoService = new TodoService(fastify.prisma, fastify.queues?.notifications);

  // ── POST / (orchestrated create) ─────────────────────────────────────────────
  fastify.post(
    '/',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Create a todo using the Golden Orchestrator pattern',
        tags: ['Todos'],
        security: [{ bearerAuth: [] }],
        body: CreateTodoBodySchema,
        response: { 201: CreateTodoResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await todoService.createTodo(
        {
          title: request.body.title,
          description: request.body.description,
          userId: request.user.id,
        },
        request.log as unknown as import('pino').Logger
      );

      if (!result.success) {
        // Not declared in the response schema on purpose — declaring a 400 schema
        // causes Fastify to attempt serializing its own body-validation errors
        // against it, which fails. Cast to satisfy the TypeBox reply type.
        return reply.status(400).send({
          success: false,
          error: {
            message: result.error?.message ?? 'Failed to create todo',
            statusCode: 400,
          },
        } as never);
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
      schema: {
        description: 'Todo service health check',
        tags: ['Todos'],
        response: { 200: TodoHealthResponseSchema },
      },
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
      schema: {
        description: 'List all todos for the authenticated user',
        tags: ['Todos'],
        security: [{ bearerAuth: [] }],
        response: { 200: ListTodosResponseSchema },
      },
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
  // requirePermission gates by role; requireOwnership ensures a 'user' can only
  // read their own todo (admins bypass ownership).
  fastify.get(
    '/:id',
    {
      preValidation: [fastify.authenticate],
      preHandler: [
        requirePermission('todo', 'read'),
        requireOwnership(async (req) => {
          const { id } = req.params as { id: string };
          const todo = await fastify.prisma.todo.findUnique({
            where: { id },
            select: { userId: true },
          });
          return todo?.userId;
        }),
      ],
      schema: {
        description: 'Get a single todo (owner or admin only)',
        tags: ['Todos'],
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              id: Type.String(),
              title: Type.String(),
              description: Type.String(),
              completed: Type.Boolean(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
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
