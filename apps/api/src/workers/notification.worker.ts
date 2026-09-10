import { Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { context, propagation, trace } from "@opentelemetry/api";
import { QUEUE_NAMES } from "../queue/index.js";
import type { NotificationJobData } from "../queue/types.js";
import { createLogger } from "../core/utils/logger.js";
import { deliverEmail } from "../modules/auth/services/mailer.js";

const log = createLogger("notification-worker");
const tracer = trace.getTracer("notification-worker");

/**
 * Processes a notification under the trace context propagated by the API.
 * Email jobs use the configured production provider; domain notifications are
 * logged until a dedicated downstream channel is configured.
 */
async function process(job: Job<NotificationJobData>): Promise<void> {
  const parentCtx = propagation.extract(context.active(), job.data._otel ?? {});
  await context.with(parentCtx, async () => {
    const span = tracer.startSpan("notification.process");
    try {
      if (job.data.type === "email.send") {
        await deliverEmail({
          to: job.data.to,
          subject: job.data.subject,
          text: job.data.text,
        });
      } else if (job.data.type === "todo.created") {
        log.info(
          { jobId: job.id, todoId: job.data.todoId, userId: job.data.userId },
          "Todo notification delivered",
        );
      } else {
        log.info(
          { jobId: job.id, orderId: job.data.orderId, userId: job.data.userId },
          "Order notification delivered",
        );
      }
      span.end();
    } catch (err) {
      span.recordException(err as Error);
      span.end();
      throw err; // let BullMQ retry per the job's backoff policy
    }
  });
}

export function createNotificationWorker(
  connection: Redis,
): Worker<NotificationJobData> {
  const worker = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATIONS,
    process,
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    log.debug({ jobId: job.id }, "Notification job completed");
  });

  worker.on("failed", (job, err) => {
    // After all attempts are exhausted, the job stays in the failed set (DLQ).
    const exhausted = job
      ? job.attemptsMade >= (job.opts.attempts ?? 1)
      : false;
    log[exhausted ? "error" : "warn"](
      { jobId: job?.id, attemptsMade: job?.attemptsMade, err },
      exhausted
        ? "Notification job dead-lettered (all retries exhausted)"
        : "Notification job attempt failed",
    );
  });

  return worker;
}
