import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { Prisma } from "@prisma/client";
import {
  USER_ROUTES,
  USER_CONTRACTS,
  toFastifySchema,
} from "@app/api-contracts";
import type { PermissionKey, ListUsersQuery } from "@app/api-contracts";
import { requirePermission } from "@core/authorization/index.js";
import { NotFoundError } from "@core/errors/index.js";
import { normalizePagination, buildPageMeta } from "@core/utils/index.js";

/**
 * Users routes — consume the shared Level 2 contracts (API_CONTRACTS §80).
 * Method, schemas, auth, and permission metadata all come from USER_CONTRACTS;
 * the route file only owns registration + the handler. Registration paths are
 * relative to the `/users` module prefix, so we use USER_ROUTES here while the
 * contract carries the absolute path for the Admin/tests.
 *
 * Schema fields are referenced directly from the contract (rather than the
 * loosely-typed toFastifySchema helper) so the TypeBox provider still infers
 * request/response types.
 */
const userRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const listContract = USER_CONTRACTS.LIST;
  const meContract = USER_CONTRACTS.ME;

  // ── GET / (paginated list) ────────────────────────────────────────────────
  fastify.get(
    USER_ROUTES.LIST,
    {
      preValidation: [fastify.authenticate],
      // Permission comes from the contract — descriptive metadata there,
      // enforced here at runtime.
      preHandler: [requirePermission(listContract.permission as PermissionKey)],
      // Schema (incl. documented error responses) derived from the contract.
      schema: toFastifySchema(listContract),
    },
    async (request, reply) => {
      // toFastifySchema erases the query type (it returns a generic
      // FastifyRouteSchema), so re-apply the contract's inferred query type.
      const query = request.query as ListUsersQuery;
      const { page, pageSize, skip, take } = normalizePagination(query);
      const { search, role, sortBy = "createdAt", sortOrder = "desc" } = query;

      // Whitelisted, validated filters only — never raw client SQL/columns.
      const where: Prisma.UserWhereInput = {
        ...(role ? { role } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [rows, total] = await Promise.all([
        fastify.prisma.user.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        }),
        fastify.prisma.user.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
        meta: buildPageMeta(page, pageSize, total),
      });
    },
  );

  // ── GET /me ─────────────────────────────────────────────────────────────────
  // Returns the authenticated profile PLUS the caller's effective roles and
  // permissions so the admin frontend can drive permission-aware UI. UX only —
  // the API still enforces every permission server-side.
  fastify.get(
    USER_ROUTES.ME,
    {
      preValidation: [fastify.authenticate],
      schema: toFastifySchema(meContract),
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
        // Domain error → centralized handler emits the canonical envelope with
        // the stable USER_NOT_FOUND code (not reply.notFound(), which produces
        // sensible's non-standard shape).
        throw new NotFoundError("User not found", "USER_NOT_FOUND");
      }

      const ctx = await fastify.authorization.getContext(user.id);

      return reply.send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          roles: ctx.roles,
          permissions: ctx.permissions,
        },
      });
    },
  );
};

export default userRoutes;
