import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
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
  const todoService = new TodoService(fastify.prisma);

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
};

export default todoRoutes;
