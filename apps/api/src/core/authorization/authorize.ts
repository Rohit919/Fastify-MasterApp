import type { FastifyRequest, FastifyReply } from 'fastify';
import { rolesFor, type Resource, type Action } from './permissions.js';

/**
 * preHandler factory — legacy role check against the static permission matrix.
 * Kept for the todo/user ownership demos. New routes should prefer the
 * DB-backed `requirePermission(PermissionKey)` guard instead.
 * Assumes fastify.authenticate ran first (request.user populated).
 *
 *   preHandler: [fastify.authenticate, requireRolePermission('todo', 'create')]
 */
export function requireRolePermission<R extends Resource>(resource: R, action: Action<R>) {
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
