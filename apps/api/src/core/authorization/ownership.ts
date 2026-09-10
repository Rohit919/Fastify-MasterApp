import type { FastifyRequest } from "fastify";
import type { PermissionKey } from "@app/api-contracts";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@core/errors/index.js";

export interface OwnershipOptions {
  /** Permission whose holders may operate on resources owned by another user. */
  bypassPermission?: PermissionKey;
}

/**
 * Enforce resource ownership using the database-backed authorization context.
 * All failures flow through the canonical global error handler.
 */
export function requireOwnership(
  getOwnerId: (request: FastifyRequest) => Promise<string | undefined | null>,
  options: OwnershipOptions = {},
) {
  return async function (request: FastifyRequest): Promise<void> {
    if (!request.user?.id) throw new UnauthorizedError();

    if (options.bypassPermission) {
      const authz =
        await request.server.authorization.getContextForRequest(request);
      if (authz.permissions.includes(options.bypassPermission)) return;
    }

    const ownerId = await getOwnerId(request);
    if (ownerId === undefined || ownerId === null) {
      throw new NotFoundError("Resource not found");
    }
    if (ownerId !== request.user.id) {
      throw new ForbiddenError("You do not have access to this resource.");
    }
  };
}
