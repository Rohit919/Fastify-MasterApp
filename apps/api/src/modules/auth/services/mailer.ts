import type { Queue } from "bullmq";
import { createLogger } from "@core/utils/logger.js";
import { withCircuitBreaker } from "@core/circuit-breaker.js";
import { enqueueNotification } from "@/queue/producer.js";
import type { EmailJobData } from "@/queue/types.js";

const log = createLogger("mailer");

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Queue email delivery when a producer is available. Tests/local tools without
 * Redis fall back to direct delivery, which is a safe log-only provider by
 * default. Production must explicitly configure EMAIL_PROVIDER=postmark.
 */
export async function sendEmail(
  message: EmailMessage,
  queue?: Queue,
): Promise<void> {
  if (queue) {
    await enqueueNotification<EmailJobData>(queue, {
      type: "email.send",
      ...message,
    });
    return;
  }
  await deliverEmail(message);
}

/** Called by the notification worker; never re-enqueues. */
export async function deliverEmail(message: EmailMessage): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "log";

  if (provider === "log") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("EMAIL_PROVIDER must be configured in production");
    }
    log.info(
      { to: message.to, subject: message.subject, body: message.text },
      "email.dispatch (development log provider)",
    );
    return;
  }

  if (provider !== "postmark") {
    throw new Error(`Unsupported email provider: ${provider}`);
  }

  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.EMAIL_FROM;
  if (!token || !from) {
    throw new Error(
      "POSTMARK_SERVER_TOKEN and EMAIL_FROM are required for Postmark delivery",
    );
  }

  await withCircuitBreaker(
    "postmark",
    async (signal) => {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": token,
        },
        body: JSON.stringify({
          From: from,
          To: message.to,
          Subject: message.subject,
          TextBody: message.text,
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Postmark rejected email (${response.status}): ${body.slice(0, 300)}`,
        );
      }
    },
    { timeout: 5_000, errorThresholdPercentage: 50, resetTimeout: 30_000 },
  );
}
