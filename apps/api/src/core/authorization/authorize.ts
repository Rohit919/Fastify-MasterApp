import type { FastifyRequest, FastifyReply } from 'fastify';
import { rolesFor, type Resource, type Action } from './permissions.js';

/**
 * preHandler factory — role check against the permission matrix.
 * Assumes fastify.authenticate ran first (request.user populated).
 *
 *   preHandler: [fastify.authenticate, requirePermission('todo', 'create')]
 */
export function requirePermission<R extends Resource>(resource: R, action: Action<R>) {
  const allowed = rolesFor(resource, action);
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const role = request.user?.role;
    if (!role) {
      return reply.status(401).send({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
    }
    if (!allowed.includes(role)) {
      return reply.status(403).send({
        success: false,
        error: { message: 'Forbidden', statusCode: 403 },
      });
    }
  };
}
