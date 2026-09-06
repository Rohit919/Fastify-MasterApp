import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * preHandler factory — resource ownership check.
 *
 * `getOwnerId` resolves the userId that owns the target resource (usually a DB
 * lookup by :id). Admins bypass the check. A non-admin whose id doesn't match
 * the owner gets 403. Missing resource → 404.
 *
 *   preHandler: [
 *     fastify.authenticate,
 *     requirePermission('todo', 'update'),
 *     requireOwnership(async (req) =>
 *       (await prisma.todo.findUnique({ where: { id: req.params.id } }))?.userId),
 *   ]
 */
export function requireOwnership(
  getOwnerId: (request: FastifyRequest) => Promise<string | undefined | null>
) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Admins can operate on any resource.
    if (request.user?.role === 'admin') return;

    const ownerId = await getOwnerId(request);
    if (ownerId === undefined || ownerId === null) {
      return reply.status(404).send({
        success: false,
        error: { message: 'Resource not found', statusCode: 404 },
      });
    }
    if (ownerId !== request.user?.id) {
      return reply.status(403).send({
        success: false,
        error: { message: 'Forbidden', statusCode: 403 },
      });
    }
  };
}
