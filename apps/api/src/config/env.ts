import { Type, type Static } from "@sinclair/typebox";

/**
 * Environment variable schema — the single source of truth for all config.
 * Validated at startup by @fastify/env (see plugins/env.ts).
 */
export const envSchema = Type.Object({
  NODE_ENV: Type.String({ default: "development" }),
  PORT: Type.Number({ default: 3000 }),
  HOST: Type.String({ default: "0.0.0.0" }),
  LOG_LEVEL: Type.String({ default: "info" }),
  // Comma-separated trusted proxy IPs/CIDRs. Empty means do not trust forwarded headers.
  TRUST_PROXY: Type.String({ default: "" }),

  // Database — DATABASE_URL is the app connection (through PgBouncer in prod).
  // DATABASE_DIRECT_URL bypasses the pooler for migrations (Prisma needs a
  // direct session). Optional: falls back to DATABASE_URL when unset.
  DATABASE_URL: Type.String(),
  DATABASE_DIRECT_URL: Type.Optional(Type.String()),
  DATABASE_STATEMENT_TIMEOUT_MS: Type.Integer({ minimum: 100, default: 10000 }),

  // Redis (distributed rate limiting, queues). When REDIS_REQUIRED=false the
  // API remains ready in a documented degraded mode if Redis is unavailable.
  REDIS_URL: Type.String({ default: "redis://localhost:6379" }),
  REDIS_REQUIRED: Type.Boolean({ default: false }),
  QUEUES_ENABLED: Type.Boolean({ default: true }),

  // Authentication
  JWT_SECRET: Type.String({ minLength: 32 }),
  JWT_EXPIRES_IN: Type.String({ default: "15m" }),
  REFRESH_TOKEN_EXPIRES_IN: Type.String({ default: "7d" }),
  // Sets the Secure flag on the refresh-token cookie. Enable in production
  // (HTTPS); leave false for local HTTP dev.
  HTTPS_ONLY: Type.Boolean({ default: false }),
  REQUIRE_EMAIL_VERIFICATION: Type.Boolean({ default: true }),

  // Transactional email. `log` is development-only; production should use postmark.
  EMAIL_PROVIDER: Type.Union([Type.Literal("log"), Type.Literal("postmark")], {
    default: "log",
  }),
  EMAIL_FROM: Type.Optional(Type.String({ format: "email" })),
  POSTMARK_SERVER_TOKEN: Type.Optional(Type.String({ minLength: 10 })),

  // API
  API_PREFIX: Type.String({ default: "/api" }),
  API_VERSION: Type.String({ default: "v1" }),

  // Rate Limiting
  RATE_LIMIT_MAX: Type.Number({ default: 100 }),
  RATE_LIMIT_TIME_WINDOW: Type.Number({ default: 60000 }),

  // CORS
  CORS_ORIGIN: Type.String({
    default: "http://localhost:3001,http://localhost:3000",
  }),
  CORS_CREDENTIALS: Type.Boolean({ default: true }),

  // Monitoring
  METRICS_ENABLED: Type.Boolean({ default: true }),
  METRICS_PATH: Type.String({ default: "/metrics" }),
  // Optional bearer token to protect the /metrics endpoint. If unset, /metrics is open (dev).
  METRICS_TOKEN: Type.Optional(Type.String({ minLength: 20 })),

  // Swagger — disabled by default; must be explicitly enabled (avoids exposing the schema in prod)
  SWAGGER_ENABLED: Type.Boolean({ default: false }),
  SWAGGER_PATH: Type.String({ default: "/documentation" }),

  // Secrets provider: env (default) | aws | vault | doppler
  SECRETS_PROVIDER: Type.String({ default: "env" }),

  // Tracing — opt-in. When enabled, spans are exported to the OTLP endpoint.
  OTEL_ENABLED: Type.Boolean({ default: false }),
  OTEL_EXPORTER_OTLP_ENDPOINT: Type.String({
    default: "http://localhost:4318/v1/traces",
  }),
  OTEL_SERVICE_NAME: Type.String({ default: "fastify-api" }),
});

export type Env = Static<typeof envSchema>;
