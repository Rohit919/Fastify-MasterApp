import type { OrderCreatedJobData } from "@/queue/types.js";
import { enqueueNotification } from "@/queue/producer.js";
import type { CreateOrderContext } from "../orders.types.js";

export async function publishOrder(
  context: CreateOrderContext,
): Promise<CreateOrderContext> {
  if (!context.order || !context.outboxEventId || !context.notificationsQueue)
    return context;

  await enqueueNotification<OrderCreatedJobData>(
    context.notificationsQueue,
    {
      type: "order.created",
      orderId: context.order.id,
      userId: context.order.userId,
      totalCents: context.order.totalCents,
    },
    { jobId: context.outboxEventId },
  );
  await context.prisma.outboxEvent.updateMany({
    where: {
      id: context.outboxEventId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
    data: { status: "PUBLISHED", processedAt: new Date(), lastError: null },
  });
  return context;
}
