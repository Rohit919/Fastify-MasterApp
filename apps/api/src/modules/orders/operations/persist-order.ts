import type { Prisma } from "@prisma/client";
import type { CreateOrderContext } from "../orders.types.js";

export async function persistOrder(
  context: CreateOrderContext,
): Promise<CreateOrderContext> {
  const { input } = context;

  const result = await context.prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.order.findUnique({
        where: {
          userId_idempotencyKey: {
            userId: input.userId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: { items: true },
      });
      if (existing) return { order: existing, outboxEventId: undefined };
    }

    const productIds = input.items.map((item) => item.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, active: true },
      select: { id: true, name: true, priceCents: true },
    });
    if (products.length !== productIds.length) {
      const found = new Set(products.map((product) => product.id));
      const missing = productIds.filter((id) => !found.has(id));
      throw new Error(`Unknown or inactive product(s): ${missing.join(", ")}`);
    }

    const byId = new Map(products.map((product) => [product.id, product]));
    const items = input.items.map((item) => {
      const product = byId.get(item.productId)!;
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
      };
    });
    const totalCents = items.reduce(
      (total, item) => total + item.quantity * item.unitPriceCents,
      0,
    );
    if (!Number.isSafeInteger(totalCents) || totalCents > 2_147_483_647) {
      throw new Error("Order total is outside the supported range");
    }

    const order = await tx.order.create({
      data: {
        userId: input.userId,
        totalCents,
        idempotencyKey: input.idempotencyKey,
        items: { create: items },
      },
      include: { items: true },
    });
    const event = await tx.outboxEvent.create({
      data: {
        type: "order.created",
        aggregateId: order.id,
        payload: {
          type: "order.created",
          orderId: order.id,
          userId: order.userId,
          totalCents: order.totalCents,
        } satisfies Prisma.InputJsonObject,
      },
    });
    return { order, outboxEventId: event.id };
  });

  context.order = result.order;
  context.outboxEventId = result.outboxEventId;
  if (!result.outboxEventId) context.results.idempotentReplay = true;
  return context;
}
