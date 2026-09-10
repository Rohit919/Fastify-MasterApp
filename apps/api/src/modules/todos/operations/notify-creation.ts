import type { TodoCreatedJobData } from "@/queue/types.js";
import type { TodoPipelineContext } from "../todos.types.js";
import { enqueueNotification } from "@/queue/producer.js";

/**
 * Best-effort low-latency publish. The durable outbox row was committed with
 * the todo, so a failure here is retried later by the outbox relay.
 */
export async function notifyCreation(
  context: TodoPipelineContext,
): Promise<TodoPipelineContext> {
  if (!context.todo || !context.outboxEventId) return context;

  if (context.notificationsQueue) {
    const jobId = await enqueueNotification<TodoCreatedJobData>(
      context.notificationsQueue,
      {
        type: "todo.created",
        todoId: context.todo.id,
        userId: context.todo.userId,
        title: context.todo.title,
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
    context.results.notificationJobId = jobId;
  } else {
    context.results.notificationDeferred = true;
  }

  return context;
}
