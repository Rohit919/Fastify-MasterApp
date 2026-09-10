import type { Logger } from "pino";
import type { FastifyBaseLogger } from "fastify";
import type { PrismaClient } from "@/generated/prisma/client.js";
import type { Queue } from "bullmq";
import {
  BaseOrchestrator,
  DefaultPerformanceTracker,
  type PipelineStage,
} from "@core/orchestration/index.js";
import {
  persistOrder,
  publishOrder,
  validateOrder,
} from "./operations/index.js";
import type {
  CreateOrderContext,
  CreateOrderInput,
  OrderWithItems,
} from "./orders.types.js";

export class CreateOrderOrchestrator extends BaseOrchestrator<
  CreateOrderContext,
  OrderWithItems,
  CreateOrderInput
> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly notificationsQueue?: Queue,
    log?: Logger | FastifyBaseLogger,
  ) {
    super(
      { name: "CreateOrderOrchestrator", timeout: 10_000, enableMetrics: true },
      log,
    );
  }

  protected async initializeContext(
    input: CreateOrderInput,
  ): Promise<CreateOrderContext> {
    return {
      input,
      prisma: this.prisma,
      notificationsQueue: this.notificationsQueue,
      requestId: crypto.randomUUID(),
      startTime: Date.now(),
      perfTracker: new DefaultPerformanceTracker(),
      results: {},
      errors: [],
      metadata: { orchestrator: this.getName() },
    };
  }

  protected getPipeline(): PipelineStage<CreateOrderContext>[] {
    return [
      {
        name: "validate-order",
        operation: validateOrder,
        critical: true,
        timeout: 1_000,
      },
      {
        name: "persist-order",
        operation: persistOrder,
        critical: true,
        timeout: 5_000,
      },
      {
        name: "publish-order",
        operation: publishOrder,
        critical: false,
        timeout: 2_000,
      },
    ];
  }

  protected buildResult(context: CreateOrderContext): OrderWithItems {
    if (!context.order) throw new Error("Order creation failed");
    return context.order;
  }
}
