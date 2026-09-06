import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { UserProfileResponseSchema } from './users.schemas.js';

const userRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // ── GET /me ──────────────────────────────────────────────────────────────────
  fastify.get(
    '/me',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Get the authenticated user profile',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        response: { 200: UserProfileResponseSchema },
      },
    },
    async (request, reply) => {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.notFound('User not found');
      }

      return reply.send({
        success: true,
        data: {
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      });
    }
  );
};

export default userRoutes;
