// Start tracing first (opt-in via OTEL_ENABLED) so worker spans link to API traces.
import "../telemetry.js";

import { Redis } from "ioredis";
import { Queue } from "bullmq";
import { PrismaClient } from "@/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { createNotificationWorker } from "./notification.worker.js";
import { startOutboxRelay } from "./outbox-relay.js";
import { startMaintenance } from "./maintenance.js";
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from "../queue/index.js";
import { startWorkerMetricsServer } from "./worker-metrics.js";
import { logger } from "../core/utils/logger.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for the worker");

// BullMQ requires maxRetriesPerRequest: null on the worker's connection.
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});
const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
  connection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

const worker = createNotificationWorker(connection);
const outboxRelay = startOutboxRelay(prisma, notificationQueue, logger);
const maintenance = startMaintenance(prisma, logger);
const metricsServer = startWorkerMetricsServer(worker);

logger.info("Notification worker started");

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Worker shutting down");
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();
  try {
    maintenance.close();
    await outboxRelay.close();
    await worker.close();
    await notificationQueue.close();
    await metricsServer?.close();
    await prisma.$disconnect();
    await connection.quit().catch(() => connection.disconnect());
    logger.info("Worker closed cleanly");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during worker shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
