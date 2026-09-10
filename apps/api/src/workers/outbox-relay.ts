import type { PrismaClient } from "@/generated/prisma/client.js";
import type { Queue } from "bullmq";
import type { Logger } from "pino";
import { enqueueNotification } from "../queue/producer.js";
import type { NotificationJobData } from "../queue/types.js";

const BATCH_SIZE = 50;
const POLL_MS = 2_000;

function isNotificationPayload(
  value: unknown,
): value is Omit<NotificationJobData, "_otel"> {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "todo.created" || type === "order.created" || type === "email.send"
  );
}

/** Durable DB→BullMQ relay for transactional outbox events. */
export function startOutboxRelay(
  prisma: PrismaClient,
  queue: Queue,
  log: Logger,
) {
  let closed = false;
  let running = false;

  const publishBatch = async (): Promise<void> => {
    if (closed || running) return;
    running = true;
    try {
      // Recover claims left behind by a crashed relay.
      await prisma.outboxEvent.updateMany({
        where: {
          status: "PROCESSING",
          updatedAt: { lt: new Date(Date.now() - 60_000) },
        },
        data: { status: "PENDING", availableAt: new Date() },
      });

      const events = await prisma.outboxEvent.findMany({
        where: { status: "PENDING", availableAt: { lte: new Date() } },
        orderBy: { createdAt: "asc" },
        take: BATCH_SIZE,
      });

      for (const event of events) {
        const claimed = await prisma.outboxEvent.updateMany({
          where: { id: event.id, status: "PENDING" },
          data: { status: "PROCESSING", attempts: { increment: 1 } },
        });
        if (claimed.count !== 1) continue;

        try {
          if (!isNotificationPayload(event.payload)) {
            throw new Error(
              `Unsupported outbox event payload for ${event.type}`,
            );
          }
          await enqueueNotification(queue, event.payload, { jobId: event.id });
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: "PUBLISHED",
              processedAt: new Date(),
              lastError: null,
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          const backoffMs = Math.min(
            300_000,
            1_000 * 2 ** Math.min(event.attempts, 8),
          );
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: "PENDING",
              availableAt: new Date(Date.now() + backoffMs),
              lastError: message.slice(0, 1_000),
            },
          });
          log.warn(
            { err: error, outboxEventId: event.id },
            "Outbox publish failed; retry scheduled",
          );
        }
      }
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void publishBatch(), POLL_MS);
  timer.unref();
  void publishBatch();

  return {
    close: async () => {
      closed = true;
      clearInterval(timer);
      while (running) await new Promise((resolve) => setTimeout(resolve, 25));
    },
  };
}
