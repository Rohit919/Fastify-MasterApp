import type { OperationContext } from "@core/orchestration/index.js";
import type { Prisma, PrismaClient } from "@/generated/prisma/client.js";
import type { Queue } from "bullmq";

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: true };
}>;

export interface CreateOrderInput {
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  idempotencyKey?: string;
}

export interface CreateOrderContext extends OperationContext {
  input: CreateOrderInput;
  prisma: PrismaClient;
  notificationsQueue?: Queue;
  order?: OrderWithItems;
  outboxEventId?: string;
}
