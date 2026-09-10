import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { OrderStatus as PrismaOrderStatus } from "@prisma/client";
import {
  ORDER_CONTRACTS,
  PermissionKeys,
  toFastifySchema,
  type CreateOrderBody,
  type ListOrdersQuery,
  type OrderDto,
} from "@app/api-contracts";
import {
  requireOwnership,
  requirePermission,
} from "@core/authorization/index.js";
import { NotFoundError, ValidationError } from "@core/errors/index.js";
import { normalizePagination, buildPageMeta } from "@core/utils/index.js";
import { CreateOrderOrchestrator } from "./orders.orchestrator.js";
import { OrderRepository } from "./repositories/order.repository.js";
import type { OrderWithItems } from "./orders.types.js";

function toDto(order: OrderWithItems): OrderDto {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    totalCents: order.totalCents,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function idempotencyKey(headers: Record<string, unknown>): string | undefined {
  const value = headers["idempotency-key"];
  const key = Array.isArray(value) ? value[0] : value;
  if (key === undefined) return undefined;
  if (
    typeof key !== "string" ||
    key.length > 128 ||
    !/^[\x21-\x7E]+$/.test(key)
  ) {
    throw new ValidationError(
      "Idempotency-Key must be 1–128 visible ASCII characters",
    );
  }
  return key;
}

const orderRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const repository = new OrderRepository(fastify.prisma);

  fastify.get(
    "/",
    {
      preValidation: [fastify.authenticate],
      preHandler: [requirePermission(PermissionKeys.OrdersRead)],
      schema: toFastifySchema(ORDER_CONTRACTS.LIST),
    },
    async (request, reply) => {
      const query = request.query as ListOrdersQuery;
      const { page, pageSize, skip, take } = normalizePagination(query);
      const authz = await fastify.authorization.getContextForRequest(request);
      const canReadAll = authz.permissions.includes(
        PermissionKeys.OrdersReadAll,
      );
      const [orders, total] = await repository.list({
        userId: canReadAll ? undefined : request.user.id,
        status: query.status as PrismaOrderStatus | undefined,
        skip,
        take,
      });
      return reply.send({
        success: true,
        data: orders.map(toDto),
        meta: buildPageMeta(page, pageSize, total),
      });
    },
  );

  fastify.post(
    "/",
    {
      preValidation: [fastify.authenticate],
      preHandler: [requirePermission(PermissionKeys.OrdersCreate)],
      schema: toFastifySchema(ORDER_CONTRACTS.CREATE),
    },
    async (request, reply) => {
      const body = request.body as CreateOrderBody;
      const orchestrator = new CreateOrderOrchestrator(
        fastify.prisma,
        fastify.queues?.notifications,
        request.log,
      );
      const result = await orchestrator.execute({
        userId: request.user.id,
        items: body.items,
        idempotencyKey: idempotencyKey(request.headers),
      });
      if (!result.success)
        throw new ValidationError(
          result.error?.message ?? "Order creation failed",
        );
      return reply
        .status(201)
        .send({ success: true, data: toDto(result.data!) });
    },
  );

  fastify.get(
    "/:id",
    {
      preValidation: [fastify.authenticate],
      preHandler: [
        requirePermission(PermissionKeys.OrdersRead),
        requireOwnership(
          async (request) => {
            const order = await repository.getById(
              (request.params as { id: string }).id,
            );
            return order?.userId;
          },
          { bypassPermission: PermissionKeys.OrdersReadAll },
        ),
      ],
      schema: toFastifySchema(ORDER_CONTRACTS.GET_BY_ID),
    },
    async (request, reply) => {
      const order = await repository.getById(
        (request.params as { id: string }).id,
      );
      if (!order) throw new NotFoundError("Order not found");
      return reply.send({ success: true, data: toDto(order) });
    },
  );

  fastify.post(
    "/:id/cancel",
    {
      preValidation: [fastify.authenticate],
      preHandler: [
        requirePermission(PermissionKeys.OrdersCancel),
        requireOwnership(
          async (request) => {
            const order = await repository.getById(
              (request.params as { id: string }).id,
            );
            return order?.userId;
          },
          { bypassPermission: PermissionKeys.OrdersReadAll },
        ),
      ],
      schema: toFastifySchema(ORDER_CONTRACTS.CANCEL),
    },
    async (request, reply) => {
      const order = await repository.cancel(
        (request.params as { id: string }).id,
      );
      return reply.send({ success: true, data: toDto(order) });
    },
  );
};

export default orderRoutes;
