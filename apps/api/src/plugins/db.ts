import fp from "fastify-plugin";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

function withStatementTimeout(
  connectionString: string,
  timeoutMs: number,
): string {
  const url = new URL(connectionString);
  const previous = url.searchParams.get("options")?.trim();
  const option = `-c statement_timeout=${timeoutMs}`;
  url.searchParams.set("options", previous ? `${previous} ${option}` : option);
  return url.toString();
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const isDev = fastify.config.NODE_ENV === "development";
  const slowQueryMs = isDev ? 100 : 500;
  const connectionString = withStatementTimeout(
    fastify.config.DATABASE_URL,
    fastify.config.DATABASE_STATEMENT_TIMEOUT_MS,
  );
  const base = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    transactionOptions: { maxWait: 5_000, timeout: 10_000 },
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "warn" },
      { emit: "event", level: "error" },
    ],
  });

  base.$on("query", (event: Prisma.QueryEvent) => {
    if (event.duration > slowQueryMs) {
      fastify.log.warn(
        {
          durationMs: event.duration,
          ...(isDev ? { query: event.query } : {}),
        },
        "Slow database query",
      );
    }
  });
  base.$on("error", (event: Prisma.LogEvent) => {
    fastify.log.error({ target: event.target }, event.message);
  });

  await base.$connect();
  fastify.decorate("prisma", base);
  fastify.addHook("onClose", async () => base.$disconnect());
};

export default fp(dbPlugin, { name: "prisma" });
