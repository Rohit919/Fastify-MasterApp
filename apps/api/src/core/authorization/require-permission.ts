import type { FastifyRequest, FastifyReply } from 'fastify';
import type { PermissionKey } from '@app/api-contracts';

/**
 * Permission-based route guards. These are the primary authorization boundary:
 * a route declares the capability it needs, the guard resolves the caller's
 * effective permissions (via fastify.authorization) and allows/denies.
 *
 * Default-deny: if the permission is not explicitly granted, access is refused.
 * Assumes fastify.authenticate ran first (request.user populated).
 *
 *   preValidation: [fastify.authenticate],
 *   preHandler: [requirePermission(PermissionKeys.UsersRead)],
 *
 * The reply-directly idiom matches the existing requireOwnership/requirePermission
 * (role matrix) guards so responses stay consistent.
 */

function deny(reply: FastifyReply, statusCode: 401 | 403, message: string): void {
  reply.status(statusCode).send({
    success: false,
    error: { message, statusCode },
  });
}

/** Require a single permission. */
export function requirePermission(permission: PermissionKey) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user?.id) return deny(reply, 401, 'Unauthorized');

    const ctx = await request.server.authorization.getContextForRequest(request);
    if (!ctx.permissions.includes(permission)) {
      // Log the denial (no resource contents) for security observability.
      request.log.warn(
        {
          event: 'authorization.denied',
          userId: ctx.userId,
          permission,
          route: request.routeOptions?.url ?? request.url,
          requestId: request.id,
        },
        'authorization denied'
      );
      return deny(reply, 403, 'You do not have permission to perform this action.');
    }
  };
}

/** Require ANY of the given permissions. */
export function requireAnyPermission(permissions: PermissionKey[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user?.id) return deny(reply, 401, 'Unauthorized');

    const ctx = await request.server.authorization.getContextForRequest(request);
    if (!permissions.some((p) => ctx.permissions.includes(p))) {
      request.log.warn(
        {
          event: 'authorization.denied',
          userId: ctx.userId,
          permission: permissions.join('|'),
          route: request.routeOptions?.url ?? request.url,
          requestId: request.id,
        },
        'authorization denied'
      );
      return deny(reply, 403, 'You do not have permission to perform this action.');
    }
  };
}

/** Require ALL of the given permissions. */
export function requireAllPermissions(permissions: PermissionKey[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user?.id) return deny(reply, 401, 'Unauthorized');

    const ctx = await request.server.authorization.getContextForRequest(request);
    if (!permissions.every((p) => ctx.permissions.includes(p))) {
      request.log.warn(
        {
          event: 'authorization.denied',
          userId: ctx.userId,
          permission: permissions.join('&'),
          route: request.routeOptions?.url ?? request.url,
          requestId: request.id,
        },
        'authorization denied'
      );
      return deny(reply, 403, 'You do not have permission to perform this action.');
    }
  };
}
