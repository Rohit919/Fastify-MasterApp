import type { FastifyRequest } from "fastify";
import type { PermissionKey } from "@app/api-contracts";
import { ForbiddenError, UnauthorizedError } from "@core/errors/index.js";

function logDenial(
  request: FastifyRequest,
  permission: string,
  userId: string,
): void {
  request.log.warn(
    {
      event: "authorization.denied",
      userId,
      permission,
      route: request.routeOptions?.url ?? request.url,
      requestId: request.id,
    },
    "authorization denied",
  );
}

async function contextFor(request: FastifyRequest) {
  if (!request.user?.id) throw new UnauthorizedError();
  return request.server.authorization.getContextForRequest(request);
}

/** Require a single database-backed permission. Default-deny. */
export function requirePermission(permission: PermissionKey) {
  return async function (request: FastifyRequest): Promise<void> {
    const ctx = await contextFor(request);
    if (!ctx.permissions.includes(permission)) {
      logDenial(request, permission, ctx.userId);
      throw new ForbiddenError(
        "You do not have permission to perform this action.",
      );
    }
  };
}

/** Require any one of the supplied permissions. */
export function requireAnyPermission(permissions: PermissionKey[]) {
  return async function (request: FastifyRequest): Promise<void> {
    const ctx = await contextFor(request);
    if (
      !permissions.some((permission) => ctx.permissions.includes(permission))
    ) {
      logDenial(request, permissions.join("|"), ctx.userId);
      throw new ForbiddenError(
        "You do not have permission to perform this action.",
      );
    }
  };
}

/** Require every supplied permission. */
export function requireAllPermissions(permissions: PermissionKey[]) {
  return async function (request: FastifyRequest): Promise<void> {
    const ctx = await contextFor(request);
    if (
      !permissions.every((permission) => ctx.permissions.includes(permission))
    ) {
      logDenial(request, permissions.join("&"), ctx.userId);
      throw new ForbiddenError(
        "You do not have permission to perform this action.",
      );
    }
  };
}
