import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";

const DAY_MS = 24 * 60 * 60 * 1_000;

/** Periodically removes expired credentials and old delivered outbox events. */
export function startMaintenance(prisma: PrismaClient, log: Logger) {
  const run = async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - DAY_MS);
    const outboxCutoff = new Date(now.getTime() - 7 * DAY_MS);
    const auditDays = Math.max(
      30,
      Number(process.env.AUDIT_RETENTION_DAYS ?? 365),
    );
    const auditCutoff = new Date(now.getTime() - auditDays * DAY_MS);
    try {
      const [refresh, otp, reset, outbox, audit] = await prisma.$transaction([
        prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
        prisma.otpChallenge.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: oneDayAgo } },
              { consumedAt: { lt: oneDayAgo } },
            ],
          },
        }),
        prisma.passwordResetToken.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: oneDayAgo } },
              { consumedAt: { lt: oneDayAgo } },
            ],
          },
        }),
        prisma.outboxEvent.deleteMany({
          where: { status: "PUBLISHED", processedAt: { lt: outboxCutoff } },
        }),
        prisma.auditLog.deleteMany({
          where: { createdAt: { lt: auditCutoff } },
        }),
      ]);
      log.info(
        {
          refresh: refresh.count,
          otp: otp.count,
          reset: reset.count,
          outbox: outbox.count,
          audit: audit.count,
        },
        "Maintenance retention completed",
      );
    } catch (error) {
      log.warn({ err: error }, "Maintenance retention failed");
    }
  };

  const timer = setInterval(() => void run(), DAY_MS);
  timer.unref();
  void run();
  return { close: () => clearInterval(timer) };
}
