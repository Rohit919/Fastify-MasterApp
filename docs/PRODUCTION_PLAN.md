# Production Engineering Plan
### Fastify Gold Standard Starter → Production-Grade API

> **Document purpose:** This is a complete engineering specification for hardening this codebase
> for production. Every section contains the exact problem, why it matters, the exact code
> change, and acceptance criteria. Work through phases in order — each phase builds on the last.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Phase 0 — Immediate Blockers (do before any deploy)](#2-phase-0--immediate-blockers)
3. [Phase 1 — Security Hardening](#3-phase-1--security-hardening)
4. [Phase 2 — Resilience & Reliability](#4-phase-2--resilience--reliability)
5. [Phase 3 — Observability](#5-phase-3--observability)
6. [Phase 4 — CI/CD Pipeline](#6-phase-4--cicd-pipeline)
7. [Phase 5 — Database Production Readiness](#7-phase-5--database-production-readiness)
8. [Phase 6 — Infrastructure & Deployment](#8-phase-6--infrastructure--deployment)
9. [Phase 7 — Scale & Advanced Concerns](#9-phase-7--scale--advanced-concerns)
10. [Dependency Audit](#10-dependency-audit)
11. [Acceptance Criteria Summary](#11-acceptance-criteria-summary)

---

## 1. Current State Assessment

### What works well
- Plugin architecture with `fastify-plugin` is correctly encapsulated
- TypeBox schemas provide compile-time + runtime type safety in one declaration
- Golden Orchestrator pattern enforces separation of concerns for business logic
- JWT + refresh token rotation is implemented and tested
- Prisma migrations are tracked and versioned
- Multi-stage Dockerfile with non-root user and `dumb-init` for signal handling
- Prometheus metrics are wired up with per-orchestrator stage latencies
- 41 integration tests with a clean mock-based test infrastructure

### What will kill you in production

| Issue | Risk | Blast Radius |
|---|---|---|
| `process.exit(0)` on SIGTERM bypasses `app.close()` | 🔴 Data loss | Every deployment, every container restart |
| No `.dockerignore` | 🔴 Secrets in image | `.env` with DB credentials baked into Docker layers |
| `.env` is tracked by git (only `node_modules` in `.gitignore`) | 🔴 Secret leak | Everyone who can read the repo |
| Global 100 req/min on `/login` | 🔴 Brute force | Account takeover in ~17 min |
| `SWAGGER_ENABLED: true` default | 🟠 Info disclosure | Full API schema + try-it-out in production |
| `/metrics` unauthenticated | 🟠 Info disclosure | Internal timings, route names, error rates exposed |
| No CI pipeline (`.github/workflows/` doesn't exist) | 🟠 Broken deploys | No automated verification before merge |
| `prisma migrate deploy` race condition | 🟠 Data corruption | Multi-instance deployments |
| No Prisma connection pool tuning | 🟠 DB exhaustion | Default pool too small for load |
| No distributed tracing | 🟡 Blind debugging | Impossible to trace requests across restarts |
| `console.error/warn` in BaseOrchestrator | 🟡 Log loss | Bypasses Pino, breaks log aggregation |
| No alert rules | 🟡 Silent failures | Error spikes go undetected |
| No coverage thresholds | 🟡 Regression | Tests can be deleted without breaking CI |

---

## 2. Phase 0 — Immediate Blockers

> These must be done before ANY deployment to ANY environment beyond local dev.
> **Estimated time: 2–3 hours.**

---

### 0.1 — Fix `.gitignore` to exclude `.env`

**Problem:** The project's `.gitignore` only contains `node_modules`. The `.env` file with
`DATABASE_URL`, `JWT_SECRET`, and other credentials is tracked by git. If this repo is ever
pushed to GitHub, those secrets are public.

**Fix:**

```gitignore
# .gitignore — replace entirely

# Dependencies
node_modules/
.npm/

# Build output
dist/
build/

# Environment files — NEVER commit these
.env
.env.*
!.env.example     # the example file IS committed

# Prisma
prisma/generated/

# Test coverage
coverage/
.nyc_output/

# Logs
*.log
logs/

# OS / Editor
.DS_Store
.vscode/settings.json
*.swp
*.swo

# TypeScript
*.tsbuildinfo

# Docker
docker/postgres-data/
```

**Acceptance criteria:**
- `git status` shows `.env` as untracked after this change
- `git log --all --full-history -- .env` shows no commits containing `.env`
- If `.env` was previously committed: run `git rm --cached .env` and create a new commit

---

### 0.2 — Create `.env.example`

**Problem:** There is no `.env.example`. New developers have no way to know what variables are
required. A missing `DATABASE_URL` or `JWT_SECRET` causes a runtime crash, not a startup
validation error with a clear message.

**Fix:** Create `.env.example` — this IS committed to git and is the source of truth:

```bash
# .env.example
# Copy this to .env and fill in all values before running the server.
# ALL values marked <required> must be set — the server will not start without them.

# ── Server ───────────────────────────────────────────────────────────────────
NODE_ENV=development           # development | production | test
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info                 # trace | debug | info | warn | error | fatal

# ── Database ─────────────────────────────────────────────────────────────────
# <required> Full PostgreSQL connection string
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fastify_starter

# ── Authentication ───────────────────────────────────────────────────────────
# <required> Must be at least 32 characters — used to sign JWTs
JWT_SECRET=<replace-with-32-char-minimum-random-secret>
JWT_EXPIRES_IN=15m             # Access token lifetime — keep short
REFRESH_TOKEN_EXPIRES_IN=7d    # Refresh token lifetime

# ── API ──────────────────────────────────────────────────────────────────────
API_PREFIX=/api
API_VERSION=v1

# ── Rate Limiting ────────────────────────────────────────────────────────────
RATE_LIMIT_MAX=100             # Global requests per window
RATE_LIMIT_TIME_WINDOW=60000   # Window in milliseconds (60s)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Comma-separated list of allowed origins — NO trailing slashes
CORS_ORIGIN=http://localhost:3001,http://localhost:3000
CORS_CREDENTIALS=true

# ── Monitoring ───────────────────────────────────────────────────────────────
METRICS_ENABLED=true
METRICS_PATH=/metrics
# Optional: bearer token to protect the /metrics endpoint
METRICS_TOKEN=

# ── API Documentation ────────────────────────────────────────────────────────
# NEVER set to true in production — exposes full API schema
SWAGGER_ENABLED=true           # Set to false in production
SWAGGER_PATH=/documentation
```

---

### 0.3 — Fix graceful shutdown (data loss bug)

**Problem:** `src/server.ts` handles `SIGTERM` and `SIGINT` with direct `process.exit(0)` calls.
This is catastrophically wrong in production.

When `process.exit(0)` is called directly:
1. In-flight HTTP requests are aborted mid-response
2. `app.close()` is never called
3. Fastify's `onClose` hooks never fire
4. `prisma.$disconnect()` never runs — any open transactions or prepared statements are
   abandoned on the DB side, potentially leaving locks
5. Pino's async transport never flushes — last log lines are lost

`dumb-init` in the Dockerfile correctly forwards `SIGTERM` to the Node process — but the
Node process then immediately kills itself without cleanup.

**Fix:**

```typescript
// src/server.ts — complete replacement

import { buildApp } from './app.js';
import { logger } from './utils/logger.js';

// buildApp is called at module level so shutdown handlers can reference the instance
const app = await buildApp().catch((err) => {
  logger.error({ err }, 'Failed to build application');
  process.exit(1);
});

const start = async () => {
  try {
    await app.listen({
      port: app.config.PORT,
      host: app.config.HOST,
    });

    logger.info(`Server ready — http://${app.config.HOST}:${app.config.PORT}`);
    logger.info(`API: http://${app.config.HOST}:${app.config.PORT}${app.config.API_PREFIX}/${app.config.API_VERSION}`);

    if (app.config.SWAGGER_ENABLED) {
      logger.info(`Docs: http://${app.config.HOST}:${app.config.PORT}${app.config.SWAGGER_PATH}`);
    }
    if (app.config.METRICS_ENABLED) {
      logger.info(`Metrics: http://${app.config.HOST}:${app.config.PORT}${app.config.METRICS_PATH}`);
    }
  } catch (err) {
    logger.error({ err }, 'Server startup failed');
    process.exit(1);
  }
};

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// 1. Stop accepting new connections
// 2. Wait for in-flight requests to complete (Fastify handles this)
// 3. Fire all onClose hooks (Prisma disconnect, etc.)
// 4. Exit cleanly
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received — draining connections');

  // Set a hard deadline: if shutdown takes longer than 10s, force exit.
  // This prevents a hung connection from blocking a deploy forever.
  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s — forcing exit');
    process.exit(1);
  }, 10_000);

  // Allow the timer to be garbage collected if shutdown completes in time
  forceExit.unref();

  try {
    await app.close(); // drains in-flight requests, fires onClose hooks
    logger.info('Server closed cleanly');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled errors ──────────────────────────────────────────────────────────
// These are programming errors, not operational errors.
// Log them and exit — do NOT swallow them.
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — process will exit');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise: String(promise) }, 'Unhandled promise rejection — process will exit');
  process.exit(1);
});

start();
```

**Why the 10-second hard deadline matters:** Kubernetes and most PaaS platforms send SIGTERM
and then wait `terminationGracePeriodSeconds` (default 30s) before SIGKILL. If your app hangs
in `app.close()` (e.g., a websocket connection that never closes), you'll be killed anyway.
The explicit timeout makes your behaviour predictable and logs the reason.

**Acceptance criteria:**
- `kill -SIGTERM $(pgrep -f "node dist/server")` → server logs "draining connections", waits
  for any active requests, logs "Server closed cleanly", exits 0
- `curl -s http://localhost:3000/api/v1/todos` fired simultaneously with SIGTERM completes
  with a valid response, not a connection reset

---

### 0.4 — Create `.dockerignore`

**Problem:** No `.dockerignore` means the entire project directory — including `.env`,
`.git` (which may contain secrets in commit history), `node_modules` (hundreds of MB),
`coverage/`, test files — gets sent as Docker build context and potentially ends up in
image layers.

**Fix:**

```dockerignore
# .dockerignore

# Secrets — absolute must
.env
.env.*
!.env.example

# Git history
.git
.gitignore

# Dependencies (installed fresh in builder stage)
node_modules

# Build artifacts (built in builder stage)
dist
build

# Test artifacts
coverage
.nyc_output

# Development tooling
.husky
*.log

# Documentation (not needed in image)
docs
*.md
!README.md

# IDE
.vscode
.idea
*.swp

# Docker files themselves (avoid recursion confusion)
Dockerfile*
docker/
```

**Acceptance criteria:**
- `docker build -t test .` — build context size < 5 MB
- `docker run --rm test sh -c "cat .env"` → no such file or directory

---

## 3. Phase 1 — Security Hardening

> **Estimated time: 1–2 days.**

---

### 1.1 — Enforce minimum JWT_SECRET length

**Problem:** `JWT_SECRET: Type.String()` in `env.ts` accepts any non-empty string. A
`JWT_SECRET=secret` (6 chars) is syntactically valid but cryptographically worthless for
HMAC-SHA256 — the security of HS256 degrades with short keys.

**Fix in `src/plugins/env.ts`:**

```typescript
JWT_SECRET: Type.String({
  minLength: 32,
  description: 'HMAC-SHA256 signing secret — must be at least 32 characters',
}),
```

**Add startup assertion in `src/plugins/auth.ts`:**

```typescript
const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Fail fast — don't let a weak secret reach production silently
  if (fastify.config.JWT_SECRET.length < 32) {
    throw new Error(
      `JWT_SECRET is too short (${fastify.config.JWT_SECRET.length} chars). ` +
      'Minimum is 32 characters. Generate one with: openssl rand -hex 32'
    );
  }

  await fastify.register(fastifyJWT, {
    secret: fastify.config.JWT_SECRET,
    sign: {
      algorithm: 'HS256',  // pin the algorithm explicitly — never allow 'none'
      expiresIn: fastify.config.JWT_EXPIRES_IN,
    },
    verify: {
      algorithms: ['HS256'], // reject tokens signed with any other algorithm
    },
  });
  // ... rest unchanged
};
```

**Why algorithm pinning matters:** The `alg: none` attack allows forging JWTs without a
secret on libraries that don't pin the algorithm. Pinning `algorithms: ['HS256']` in the
verify config is a one-line defence with zero cost.

---

### 1.2 — Per-route rate limiting on auth endpoints

**Problem:** The global 100 req/min limit means an attacker can try 100 password combinations
per minute against any account. At 6-character passwords using lowercase + digits (36 chars),
they can exhaust the top-100 most common passwords in under 2 minutes.

**Architecture decision:** Use `@fastify/rate-limit`'s per-route config. The key point is
the `keyGenerator` — use email address as the key for auth routes, not IP address. An
attacker behind a CDN or using residential proxies will rotate IPs; email-keyed limiting
stops credential stuffing regardless.

**Fix in `src/routes/auth/index.ts`:**

```typescript
// POST /login — tight limit, email-keyed
fastify.post('/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes',
      // Key by email so IP rotation doesn't help attackers
      keyGenerator: (request) => {
        const body = request.body as { email?: string };
        return `login:${body?.email?.toLowerCase() ?? request.ip}`;
      },
      errorResponseBuilder: () => ({
        success: false,
        error: {
          message: 'Too many login attempts. Try again in 15 minutes.',
          statusCode: 429,
          retryAfter: 900,
        },
      }),
    },
  },
  schema: { ... },
}, handler);

// POST /register — prevent account creation spam
fastify.post('/register', {
  config: {
    rateLimit: {
      max: 3,
      timeWindow: '1 hour',
      keyGenerator: (request) => `register:${request.ip}`,
    },
  },
  schema: { ... },
}, handler);

// POST /refresh — per-token, not per-IP
fastify.post('/refresh', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
      keyGenerator: (request) => {
        const body = request.body as { refreshToken?: string };
        // Rate limit per refresh token — prevents token grinding
        return `refresh:${body?.refreshToken?.slice(0, 8) ?? request.ip}`;
      },
    },
  },
  schema: { ... },
}, handler);
```

**Also add to global config — skip health and metrics:**

```typescript
// src/app.ts — update rate limit registration
await app.register(rateLimitPlugin.default, {
  max: app.config.RATE_LIMIT_MAX,
  timeWindow: app.config.RATE_LIMIT_TIME_WINDOW,
  // Don't count health checks or metrics scrapes against limits
  skipOnError: true,
  skip: (request) =>
    request.url === '/api/v1/health' ||
    request.url === '/api/v1/ready' ||
    request.url === app.config.METRICS_PATH,
});
```

---

### 1.3 — Account lockout after failed login attempts

**Problem:** Rate limiting slows brute force but doesn't stop a distributed attack where each
IP makes only 1–2 requests. Account lockout (also called credential stuffing protection)
complements rate limiting by tracking failures at the account level regardless of IP.

**Step 1 — Add fields to User model in `prisma/schema.prisma`:**

```prisma
model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  password            String
  name                String
  role                String    @default("user")
  // Account lockout
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  lastLoginAt         DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  refreshTokens       RefreshToken[]

  @@index([email])
  @@map("users")
}
```

**Step 2 — Create migration:**
```bash
npx prisma migrate dev --name add_account_lockout
```

**Step 3 — Update login handler:**

```typescript
// src/routes/auth/index.ts — updated login handler

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async (request, reply) => {
  const { email, password } = request.body;

  const user = await fastify.prisma.user.findUnique({ where: { email } });

  // Use a timing-safe "user not found" path that doesn't reveal existence
  if (!user) {
    // Still do a bcrypt compare to prevent timing attacks that reveal
    // whether an email exists based on response time difference
    await bcrypt.compare(password, '$2b$10$invalidhashpaddingtomatchbcryptlength.invalid');
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check lockout BEFORE comparing password (saves bcrypt time on locked accounts)
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterSec = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    return reply.status(429).send({
      success: false,
      error: {
        message: 'Account temporarily locked due to too many failed attempts.',
        statusCode: 429,
        retryAfter: retryAfterSec,
      },
    });
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    const newAttempts = user.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_DURATION_MS)
          : undefined,
      },
    });

    // Always return the same message — don't tell attacker how many attempts remain
    throw new UnauthorizedError('Invalid credentials');
  }

  // Successful login — reset failure counters
  await fastify.prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  // ... rest of login (sign tokens, return response)
}
```

**Why the timing-safe "not found" path matters:** Without the fake bcrypt compare, a
timing attack can distinguish "user not found" (fast response) from "wrong password"
(slow bcrypt response), leaking whether an email is registered.

---

### 1.4 — Protect `/metrics` endpoint

**Problem:** The Prometheus metrics endpoint is completely public. It exposes:
- All route paths (information useful for mapping the API)
- Error rates per route (information about what's failing)
- Active connection counts (information about load)
- Orchestrator stage names (information about internal architecture)

**Fix — Bearer token gate in `src/plugins/metrics.ts`:**

```typescript
// Add METRICS_TOKEN to env schema (src/plugins/env.ts):
METRICS_TOKEN: Type.Optional(Type.String({ minLength: 20 })),

// In src/plugins/metrics.ts — protect the endpoint:
if (fastify.config.METRICS_ENABLED) {
  fastify.get(
    fastify.config.METRICS_PATH,
    {
      // Skip global rate limiting for the scrape endpoint
      config: { rateLimit: { max: 600, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      // If METRICS_TOKEN is configured, require it
      if (fastify.config.METRICS_TOKEN) {
        const authHeader = request.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
          ? authHeader.slice(7)
          : null;

        if (!token || token !== fastify.config.METRICS_TOKEN) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }
      }

      const metrics = await register.metrics();
      return reply.type(register.contentType).send(metrics);
    }
  );
}
```

**Update Prometheus scrape config to include the token:**
```yaml
# docker/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'fastify'
    static_configs:
      - targets: ['host.docker.internal:3000']
    authorization:
      credentials: ${METRICS_TOKEN}
```

---

### 1.5 — Disable Swagger in production by default

**Problem:** `SWAGGER_ENABLED: true` is the default. If an operator forgets to set
`SWAGGER_ENABLED=false`, the full interactive API documentation is public in production.
This gives attackers a complete attack surface map and a working client to test against.

**Fix in `src/plugins/env.ts`:**

```typescript
SWAGGER_ENABLED: Type.Boolean({ default: false }), // was: true
```

**Add a guard in `src/plugins/swagger.ts`:**

```typescript
const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  // In production, double-check and warn loudly if Swagger is somehow enabled
  if (fastify.config.SWAGGER_ENABLED && fastify.config.NODE_ENV === 'production') {
    fastify.log.warn(
      'SWAGGER_ENABLED=true in production. ' +
      'This exposes your full API schema. Disable unless intentional.'
    );
  }

  // ... rest unchanged
};
```

---

### 1.6 — Implement Content Security Policy

**Problem:** `contentSecurityPolicy: false` is hardcoded in `src/app.ts`. A CSP header is one
of the most effective defences against XSS — it tells the browser what sources are legitimate
for scripts, styles, and resources. While this API doesn't serve HTML, the Swagger UI does.

**Fix in `src/app.ts`:**

```typescript
await app.register(helmetPlugin.default, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'"],  // Swagger UI requires inline scripts
      styleSrc:      ["'self'", "'unsafe-inline'"],  // Swagger UI requires inline styles
      imgSrc:        ["'self'", 'data:', 'https:'],
      connectSrc:    ["'self'"],
      fontSrc:       ["'self'", 'https:'],
      objectSrc:     ["'none'"],
      upgradeInsecurityRequests: [],
    },
    // In development, report violations without blocking
    reportOnly: process.env.NODE_ENV !== 'production',
  },
  // Explicitly configure other helmet directives
  crossOriginEmbedderPolicy: false,    // Needed for Swagger UI assets
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,           // 1 year
    includeSubDomains: true,
    preload: true,
  },
});
```

---

### 1.7 — Refresh token family detection (stolen token defense)

**Problem:** Current token rotation revokes a token on use and issues a new one. But if an
attacker steals a refresh token and uses it before the legitimate user's client does, the
legitimate user gets a "token revoked" error — and has no idea their session was compromised.
There is no detection; the attacker silently takes over the session.

**The fix — token family tracking:**

Each "login session" gets a `family` UUID. When a refresh token is used, the new token is
issued in the same family. If a token is presented that has already been revoked, it means
someone in the family used it — ALL tokens in that family are immediately revoked and the
user must re-login.

**Step 1 — Update `RefreshToken` model:**

```prisma
model RefreshToken {
  id        String    @id @default(cuid())
  token     String    @unique
  family    String    // Groups all rotations from one login session
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([token])
  @@index([family])          // Fast family-wide revocation
  @@map("refresh_tokens")
}
```

**Step 2 — Update `createRefreshToken` helper:**

```typescript
async function createRefreshToken(
  prisma: PrismaClient,
  userId: string,
  expiresIn: string,
  family?: string  // if undefined, start a new family (new login)
): Promise<{ token: string; family: string }> {
  const token = crypto.randomUUID();
  const tokenFamily = family ?? crypto.randomUUID(); // new family on fresh login
  const expiresAt = new Date(Date.now() + parseDurationMs(expiresIn));

  await prisma.refreshToken.create({
    data: { token, family: tokenFamily, userId, expiresAt },
  });

  return { token, family: tokenFamily };
}
```

**Step 3 — Update refresh handler:**

```typescript
// POST /refresh handler
const stored = await fastify.prisma.refreshToken.findUnique({
  where: { token: refreshToken },
  include: { user: true },
});

if (!stored) {
  throw new UnauthorizedError('Invalid refresh token');
}

// STOLEN TOKEN DETECTION: this token exists but was already revoked
// This means someone used a superseded token — compromise likely.
// Revoke the entire family immediately.
if (stored.revokedAt) {
  await fastify.prisma.refreshToken.updateMany({
    where: { family: stored.family, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  fastify.log.warn(
    { userId: stored.userId, family: stored.family },
    'Refresh token reuse detected — entire session family revoked'
  );

  return reply.status(401).send({
    success: false,
    error: {
      message: 'Session invalidated due to suspicious activity. Please log in again.',
      statusCode: 401,
    },
  });
}

if (stored.expiresAt < new Date()) {
  return reply.status(401).send({
    success: false,
    error: { message: 'Refresh token expired', statusCode: 401 },
  });
}

// Revoke current token and issue new one in the same family
await fastify.prisma.refreshToken.update({
  where: { id: stored.id },
  data: { revokedAt: new Date() },
});

const { user } = stored;
const newAccessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });
const { token: newRefreshToken } = await createRefreshToken(
  fastify.prisma, user.id, fastify.config.REFRESH_TOKEN_EXPIRES_IN,
  stored.family // continue the same family
);

return reply.send({
  success: true,
  data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
});
```

---

### 1.8 — Add `maxLength` to all user-input string fields

**Problem:** The `name` field on `/register` has `minLength: 1` but no `maxLength`. An
attacker can send a 10 MB string as the name, forcing the server to hash, validate, and
store it. Always bound string lengths.

**Fix in `src/routes/auth/index.ts`:**

```typescript
// register body schema
body: Type.Object({
  email:    Type.String({ format: 'email', maxLength: 254 }), // RFC 5321 max
  password: Type.String({ minLength: 8, maxLength: 128 }),    // Also raise min to 8
  name:     Type.String({ minLength: 1, maxLength: 100 }),
}),
```

---

## 4. Phase 2 — Resilience & Reliability

> **Estimated time: 2–3 days.**

---

### 2.1 — Structured error handling throughout

**Problem:** The global error handler in `src/app.ts` builds its own response shape inline,
ignoring the `formatErrorResponse` utility in `src/utils/errors.ts`. More critically, the
`details` field from `AppError` (validation errors carry extra context here) is silently
dropped — clients never see what field failed validation.

**Fix in `src/app.ts` — use the utility and include details:**

```typescript
import { AppError, formatErrorResponse } from './utils/errors.js';

app.setErrorHandler((error, request, reply) => {
  // Distinguish operational errors (expected) from programming errors (bugs)
  const isOperational = error instanceof AppError && error.isOperational;

  if (!isOperational) {
    // Programming error — log with full stack, alert on this
    request.log.error({ err: error, requestId: request.id }, 'Unexpected error');
  } else {
    // Operational error — just log at warn level (not an alert-worthy event)
    request.log.warn({ err: error, requestId: request.id }, 'Operational error');
  }

  const statusCode = error.statusCode ?? 500;

  // In production, never expose internal error messages for 5xx errors
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : error.message ?? 'Internal Server Error';

  return reply.status(statusCode).send({
    success: false,
    error: {
      message,
      statusCode,
      requestId: request.id,
      timestamp: new Date().toISOString(),
      // Include details for 4xx errors (validation failures, etc.)
      // Never include details for 5xx (could leak internals)
      ...(statusCode < 500 && error instanceof AppError && error.details
        ? { details: error.details }
        : {}),
    },
  });
});
```

---

### 2.2 — Wire user context into request logs

**Problem:** Authenticated requests log `requestId` but not `userId`. When debugging a
production issue, "find all logs from user X" is impossible — you'd have to parse JWT
payloads from logs or correlate with auth logs separately.

**Fix — add a `preHandler` hook to `src/app.ts`:**

```typescript
// After plugin registrations, before routes
app.addHook('preHandler', async (request) => {
  // If the request has been authenticated (user is populated), attach to logger
  if (request.user) {
    // Create a child logger with userId — all subsequent request.log calls
    // will include this field automatically
    request.log = request.log.child({
      userId: request.user.id,
      userRole: request.user.role,
    });
  }
});
```

**This produces logs like:**
```json
{
  "level": "INFO",
  "requestId": "abc123",
  "userId": "cmtpvvco00000ehrvp1gcp2gc",
  "userRole": "user",
  "method": "POST",
  "url": "/api/v1/todos",
  "statusCode": 201,
  "responseTime": 23
}
```

---

### 2.3 — Improve Prisma with query timeouts and slow-query logging

**Problem:**
- No query timeout — a slow DB query holds a Fastify worker thread indefinitely
- No slow query logging in production — performance regressions are invisible
- Default connection pool may be wrong size for containerized deployment

**Fix in `src/plugins/prisma.ts`:**

```typescript
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';

const SLOW_QUERY_THRESHOLD_MS = 500;
const QUERY_TIMEOUT_MS = 10_000;

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: fastify.config.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [{ emit: 'event', level: 'error' }],
  }).$extends({
    // Query timeout middleware — prevents runaway queries
    query: {
      $allOperations({ model, operation, args, query }) {
        return Promise.race([
          query(args),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Prisma query timeout (${QUERY_TIMEOUT_MS}ms): ${model ?? 'raw'}.${operation}`)),
              QUERY_TIMEOUT_MS
            )
          ),
        ]);
      },
    },
  });

  // Log slow queries (both dev and prod — performance regressions matter everywhere)
  if (fastify.config.NODE_ENV === 'development') {
    // @ts-expect-error — PrismaClient event typing
    prisma.$on('query', (event: { query: string; duration: number }) => {
      if (event.duration > SLOW_QUERY_THRESHOLD_MS) {
        fastify.log.warn(
          { query: event.query, durationMs: event.duration },
          'Slow Prisma query'
        );
      }
    });
  }

  await prisma.$connect();
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};

export default fp(prismaPlugin, { name: 'prisma' });
```

**Connection pool guidance (add to `.env.example`):**

```bash
# For production, tune the connection pool:
# connection_limit = (expected_concurrent_requests / avg_query_duration_ratio)
# For a 1-vCPU container handling ~100 req/s with avg 5ms queries: ~10 connections
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=10&connect_timeout=10&sslmode=require
```

---

### 2.4 — Replace `console.error/warn` in BaseOrchestrator

**Problem:** `src/core/orchestration/base-orchestrator.ts` uses `console.error` and
`console.warn` directly. This:
- Bypasses Pino entirely — these messages don't get structured JSON formatting
- Don't include `requestId`, `userId`, or any context
- Won't be picked up by log aggregation tools that parse Pino's JSON output
- Mix into stdout unformatted, making log parsing brittle

**Fix — inject a Pino-compatible logger:**

```typescript
// src/core/orchestration/base-orchestrator.ts

import type { Logger } from 'pino';
import { logger as defaultLogger } from '../../utils/logger.js'; // fallback

export abstract class BaseOrchestrator<TContext, TResult, TInput = unknown> {
  protected config: Required<OrchestratorConfig>;
  protected log: Logger;

  constructor(config: OrchestratorConfig, log?: Logger) {
    this.config = {
      name: config.name,
      timeout: config.timeout ?? 30000,
      enableMetrics: config.enableMetrics ?? true,
      logErrors: config.logErrors ?? true,
    };
    // Use injected logger or fall back to module-level logger
    // The child logger includes the orchestrator name for easy filtering
    this.log = (log ?? defaultLogger).child({ orchestrator: this.config.name });
  }

  // Replace all console.error with:
  //   this.log.error({ err: error }, `Orchestration error in ${this.config.name}`);
  // Replace all console.warn with:
  //   this.log.warn({ err: error, stage: stage.name }, `Non-critical stage failed`);
}
```

**Update `CreateTodoOrchestrator` to pass request logger:**

```typescript
// src/routes/todos/index.ts — pass request.log to the service
const result = await todoService.createTodo({
  title: request.body.title,
  description: request.body.description,
  userId: request.user.id,
}, request.log); // pass logger with requestId and userId already attached

// src/services/todo/index.ts
import type { Logger } from 'pino';

export class TodoService {
  constructor(private prisma: PrismaClient) {}

  async createTodo(input: CreateTodoInput, log?: Logger) {
    const orchestrator = new CreateTodoOrchestrator(this.prisma, log);
    return orchestrator.execute(input);
  }
}
```

---

### 2.5 — Fix the Dockerfile HEALTHCHECK

**Problem:**
1. The HEALTHCHECK hits `/health` (liveness) not `/ready` (readiness). Docker considers
   the container healthy even if the database is down.
2. `--start-period=5s` is too short. Prisma `$connect()` + migration check can easily
   take 5–10 seconds on a cold container.
3. Using `node -e "require('http')..."` adds ~150ms per health check due to Node startup.

**Fix:**

```dockerfile
# Install wget in the production stage (lighter than curl, no node startup overhead)
RUN apk add --no-cache dumb-init openssl wget

HEALTHCHECK \
  --interval=30s \
  --timeout=10s \
  --start-period=30s \
  --retries=3 \
  CMD wget --no-verbose --tries=1 --spider \
      http://localhost:${PORT:-3000}/api/v1/ready || exit 1
```

---

### 2.6 — Add `nanosecond` timing to metrics

**Problem:** `metrics.ts` uses `Date.now()` which has 1ms resolution. For fast operations
(< 1ms responses, which Fastify handles routinely), this rounds everything to 0ms or 1ms —
completely useless for percentile histograms.

**Fix in `src/plugins/metrics.ts`:**

```typescript
// Extend FastifyRequest to store hrtime
declare module 'fastify' {
  interface FastifyRequest {
    startHrTime: bigint; // nanoseconds — not startTime: number
  }
}

fastify.addHook('onRequest', async (request) => {
  request.startHrTime = process.hrtime.bigint();
  httpRequestsInProgress.labels({ method: request.method }).inc();
});

fastify.addHook('onResponse', async (request, reply) => {
  // Convert nanoseconds to seconds for Prometheus convention
  const durationSeconds = Number(process.hrtime.bigint() - request.startHrTime) / 1e9;
  const route = request.routeOptions?.url ?? request.url;
  const labels = {
    method: request.method,
    route,
    status_code: reply.statusCode.toString(),
  };

  httpRequestDuration.labels(labels).observe(durationSeconds);
  httpRequestsTotal.labels(labels).inc();
  httpRequestsInProgress.labels({ method: request.method }).dec();
});
```

---

## 5. Phase 3 — Observability

> **Estimated time: 3–4 days.**

---

### 3.1 — OpenTelemetry distributed tracing

**Problem:** When a request fails or is slow, you can see the HTTP duration in Prometheus
and the error in Pino logs — but you cannot see WHERE time was spent within the request
(Prisma query? bcrypt? JWT verification?). Without traces, debugging production issues
means adding temporary logs and redeploying.

**Architecture:** Use OpenTelemetry with OTLP export. Run Jaeger or Tempo locally,
connect to a managed service (Honeycomb, Grafana Cloud) in production.

**Install:**

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/instrumentation-http \
  @opentelemetry/instrumentation-fastify \
  @prisma/instrumentation \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

**Create `src/telemetry.ts` — must be imported FIRST in server.ts:**

```typescript
// src/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'fastify-api',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.COMMIT_SHA ?? 'unknown',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new FastifyInstrumentation(),
    new PrismaInstrumentation(), // automatically traces all DB queries
  ],
});

// Start before any other imports — instruments modules as they load
sdk.start();

// Flush traces on shutdown
process.on('beforeExit', async () => {
  await sdk.shutdown();
});
```

**Update `src/server.ts` to import telemetry first:**

```typescript
// MUST be the very first import — instruments Node.js built-ins at load time
import './telemetry.js';

import { buildApp } from './app.js';
import { logger } from './utils/logger.js';
// ... rest unchanged
```

**Add trace correlation to Pino logs:**

```typescript
// src/app.ts — add hook to attach traceId to log context
import { trace } from '@opentelemetry/api';

app.addHook('onRequest', async (request) => {
  const span = trace.getActiveSpan();
  if (span) {
    const ctx = span.spanContext();
    request.log = request.log.child({
      traceId: ctx.traceId,
      spanId: ctx.spanId,
    });
  }
});
```

**Add Jaeger to `docker/docker-compose.yml`:**

```yaml
jaeger:
  image: jaegertracing/all-in-one:1.57
  container_name: fastify_jaeger
  ports:
    - "16686:16686"   # Jaeger UI
    - "4318:4318"     # OTLP HTTP
  environment:
    - COLLECTOR_OTLP_ENABLED=true
  restart: unless-stopped
```

Add env var to `.env.example`:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

---

### 3.2 — Prometheus alerting rules

**Problem:** Prometheus is collecting metrics but there are no alerts. A 5x spike in
500 errors will show up in Grafana eventually — but only if someone is looking.

**Create `docker/prometheus/alert_rules.yml`:**

```yaml
groups:
  - name: api.rules
    rules:

      # High error rate — more than 5% of requests are 5xx for 2 minutes
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate"
          description: "{{ $value | humanizePercentage }} of requests are failing"

      # P99 latency above 1 second for 5 minutes
      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
          ) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High P99 latency on {{ $labels.route }}"
          description: "P99 latency is {{ $value | humanizeDuration }}"

      # Service is down
      - alert: ServiceDown
        expr: up{job="fastify"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Fastify API is unreachable"

      # Too many active orchestrator operations (potential leak or slowdown)
      - alert: OrchestratorOverload
        expr: orchestrator_active_operations > 50
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High number of concurrent orchestrator operations"

      # Database connection issues (Prisma errors increasing)
      - alert: DatabaseErrors
        expr: rate(orchestrator_pipeline_errors_total[5m]) > 0.1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Orchestrator pipeline error rate elevated"
```

**Update `docker/prometheus/prometheus.yml`:**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'alert_rules.yml'  # ADD THIS

scrape_configs:
  - job_name: 'fastify'
    static_configs:
      - targets: ['host.docker.internal:3000']
    authorization:
      credentials_file: /etc/prometheus/metrics_token  # if METRICS_TOKEN is set
```

---

### 3.3 — Add test coverage thresholds

**Problem:** There are no coverage thresholds in `vitest.config.ts`. Tests can be deleted
or new code added without tests, and CI will still pass.

**Fix in `vitest.config.ts`:**

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],  // lcov for CI upload
      exclude: [
        'node_modules/',
        'dist/',
        '**/__tests__/**',
        '*.config.ts',
        '**/*.d.ts',
        'src/utils/test-app.ts',   // test helper, not app code
      ],
      // These thresholds cause `vitest run --coverage` to exit non-zero
      // if coverage drops below them — blocks CI merges
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   75,
        statements: 80,
      },
    },
  },
  // ... resolve aliases unchanged
});
```

---

## 6. Phase 4 — CI/CD Pipeline

> **Estimated time: 1–2 days.**

---

### 4.1 — GitHub Actions CI

**Problem:** The README references `.github/workflows/ci.yml` but this file doesn't exist.
There is no automated verification before merges.

**Create `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'

jobs:
  # ── Code Quality ─────────────────────────────────────────────────────────────
  quality:
    name: Typecheck, Lint & Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci --ignore-scripts
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check

  # ── Unit & Integration Tests ──────────────────────────────────────────────────
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: fastify_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      NODE_ENV: test
      DATABASE_URL: postgresql://test:test@localhost:5432/fastify_test
      JWT_SECRET: ci-test-secret-that-is-long-enough-for-hs256-32chars
      METRICS_ENABLED: false
      SWAGGER_ENABLED: false

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run test:coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false  # don't fail CI if Codecov is down

  # ── Build Verification ────────────────────────────────────────────────────────
  build:
    name: Build & Docker
    runs-on: ubuntu-latest
    needs: [quality, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Verify dist output
        run: ls -la dist/ && test -f dist/server.js

      # Build Docker image and verify it runs
      - name: Build Docker image
        run: docker build -t fastify-starter:${{ github.sha }} .
      - name: Test Docker image starts
        run: |
          docker run -d \
            --name test-container \
            -e DATABASE_URL=postgresql://x:x@localhost/x \
            -e JWT_SECRET=test-secret-at-least-32-characters-long \
            -e NODE_ENV=production \
            fastify-starter:${{ github.sha }}
          sleep 3
          # Should fail to start (no real DB) but not crash on startup code
          docker logs test-container
          docker rm -f test-container

  # ── Security Scanning ─────────────────────────────────────────────────────────
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci --ignore-scripts
      # Fail on high/critical vulnerabilities
      - run: npm audit --audit-level=high
      # Check for secrets accidentally committed
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          extra_args: --only-verified
```

---

### 4.2 — Deployment workflow

**Create `.github/workflows/deploy.yml`:**

```yaml
name: Deploy

on:
  push:
    branches: [main]
    tags: ['v*.*.*']

jobs:
  deploy:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix=sha-

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # For Fly.io deployment (optional)
      - name: Deploy to Fly.io
        if: github.ref == 'refs/heads/main'
        uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        if: github.ref == 'refs/heads/main'
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

## 7. Phase 5 — Database Production Readiness

> **Estimated time: 1–2 days.**

---

### 5.1 — Fix migration race condition for multi-instance deploys

**Problem:** `npm start` = `prisma migrate deploy && node dist/server.js`. When two container
instances start simultaneously (rolling deploy, horizontal scaling), both try to run
migrations. Prisma uses an advisory lock internally for `migrate deploy`, so it won't corrupt
data — but one instance will hang waiting for the lock, potentially timing out the deploy.

**Recommended pattern: separate migration job in `docker-compose.yml`:**

```yaml
# docker/docker-compose.yml — add migrate service

services:
  migrate:
    image: ${APP_IMAGE:-fastify-starter:latest}
    command: npx prisma migrate deploy
    environment:
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"   # Run once and exit

  app:
    image: ${APP_IMAGE:-fastify-starter:latest}
    command: node dist/server.js   # No migration — handled by migrate service
    depends_on:
      migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      PORT: 3000
    ports:
      - "3000:3000"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider",
             "http://localhost:3000/api/v1/ready"]
      interval: 30s
      timeout: 10s
      start_period: 30s
      retries: 3
```

**For Kubernetes:** Use an `initContainer` for migrations:

```yaml
initContainers:
  - name: migrate
    image: your-registry/fastify-api:latest
    command: ["npx", "prisma", "migrate", "deploy"]
    env:
      - name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: app-secrets
            key: database-url
```

---

### 5.2 — Add expired refresh token cleanup

**Problem:** Refresh tokens accumulate in `refresh_tokens` table indefinitely. Every login
creates a new row; tokens that expired 6 months ago are still in the table. At 1000 users
with 10 logins/day, this table has 1.8M rows per month — slowing down lookups even with
indexes.

**Fix — scheduled cleanup in `src/plugins/prisma.ts`:**

```typescript
// After prisma is connected and decorated
// Run cleanup immediately on startup, then every 24 hours
const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },           // expired
          {
            revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // revoked > 7 days ago
          },
        ],
      },
    });
    if (result.count > 0) {
      fastify.log.info({ count: result.count }, 'Cleaned up expired/revoked refresh tokens');
    }
  } catch (err) {
    fastify.log.error({ err }, 'Failed to clean up refresh tokens');
  }
};

// Initial cleanup on startup
await cleanupExpiredTokens();

// Schedule recurring cleanup
const cleanupInterval = setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

fastify.addHook('onClose', async () => {
  clearInterval(cleanupInterval);
  await prisma.$disconnect();
});
```

---

### 5.3 — Add missing indexes

**Problem:** The `Example` model has no indexes. More importantly, for production query
patterns we should verify all common query shapes have covering indexes.

```prisma
// Additional indexes to consider based on actual query patterns:

model RefreshToken {
  // Existing: @@index([userId]), @@index([token])
  // Add: composite for cleanup query
  @@index([expiresAt])   // speeds up cleanup DELETE WHERE expiresAt < now()
  @@index([family])      // speeds up family-wide revocation
}

model Todo {
  // Existing: @@index([userId])
  // Add: if listing incomplete todos is common
  @@index([userId, completed])
  @@index([createdAt])   // for time-based sorting
}
```

---

### 5.4 — Enforce SSL for production database connections

**Problem:** The `DATABASE_URL` in `.env.example` doesn't include `sslmode=require`. In
production, connecting to a managed PostgreSQL service (RDS, Supabase, Neon) without SSL
sends credentials and data in plaintext.

**Add to `.env.example`:**

```bash
# Production database — always use SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=10
```

**Add SSL enforcement in `src/plugins/prisma.ts`:**

```typescript
// Warn loudly if SSL is not configured in production
if (fastify.config.NODE_ENV === 'production') {
  const dbUrl = fastify.config.DATABASE_URL;
  if (!dbUrl.includes('sslmode=require') && !dbUrl.includes('ssl=true')) {
    fastify.log.warn(
      'DATABASE_URL does not include sslmode=require. ' +
      'Database connections in production should use SSL.'
    );
  }
}
```

---

## 8. Phase 6 — Infrastructure & Deployment

> **Estimated time: 2–3 days.**

---

### 6.1 — Pin Docker image versions

**Problem:** `prom/prometheus:latest` and `grafana/grafana:latest` in `docker-compose.yml`
will silently upgrade on the next `docker compose pull`. A Grafana major version update can
break dashboards. A Prometheus update can change metric names.

**Fix:**

```yaml
# docker/docker-compose.yml — pin all image versions

services:
  postgres:
    image: postgres:16.3-alpine  # explicit patch version

  prometheus:
    image: prom/prometheus:v2.51.2

  grafana:
    image: grafana/grafana:10.4.2
```

Update these intentionally and document the upgrade in git history.

---

### 6.2 — Remove hardcoded Grafana credentials from docker-compose

**Problem:** `GF_SECURITY_ADMIN_PASSWORD=admin` is hardcoded in the compose file and
likely committed to git. This is a credential that should never be in source control.

**Fix:**

```yaml
# docker/docker-compose.yml
grafana:
  environment:
    - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
    - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD must be set}
    # The :? syntax makes docker-compose fail with a clear error if the var is unset
```

Add to `.env.example`:

```bash
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<change-this-strong-password>
```

---

### 6.3 — Add `restart` policies to all compose services

```yaml
services:
  postgres:
    restart: unless-stopped

  prometheus:
    restart: unless-stopped

  grafana:
    restart: unless-stopped

  app:
    restart: unless-stopped
    # Also add depends_on so app restarts AFTER postgres is healthy
    depends_on:
      postgres:
        condition: service_healthy
```

---

### 6.4 — Production environment checklist

Before any production deploy, verify these environment variables are explicitly set
(not relying on defaults):

| Variable | Required | Default (safe?) | Production value |
|---|---|---|---|
| `NODE_ENV` | ✓ | `development` ❌ | `production` |
| `JWT_SECRET` | ✓ | none | `openssl rand -hex 32` |
| `DATABASE_URL` | ✓ | none | Includes `sslmode=require` |
| `CORS_ORIGIN` | ✓ | localhost ❌ | Your actual domain(s) |
| `SWAGGER_ENABLED` | ✓ | `false` ✓ | `false` |
| `METRICS_TOKEN` | ✓ | none | `openssl rand -hex 20` |
| `LOG_LEVEL` | ✓ | `info` ✓ | `warn` or `error` |
| `RATE_LIMIT_MAX` | — | `100` — tune | Based on load testing |

---

## 9. Phase 7 — Scale & Advanced Concerns

> These are important for growth but not blocking for initial production launch.

---

### 7.1 — JWKS / JWT key rotation

**Current limitation:** The single `JWT_SECRET` (symmetric HS256) cannot be rotated without
instantly invalidating all active sessions. For a user-facing product this means every
secret rotation is a forced logout of everyone.

**Migration path to RS256 with JWKS:**

1. Generate an RSA key pair at startup (or load from secrets manager)
2. Expose `GET /.well-known/jwks.json` returning public keys
3. Sign tokens with the current private key, include `kid` (key ID) in header
4. On rotation: add new key to JWKS, keep old key for verify-only until old tokens expire
5. Third-party services can verify your JWTs without sharing your secret

```typescript
// This is a significant architectural change — plan for a 2-week sprint
// when session management becomes a priority.
```

---

### 7.2 — API versioning strategy

**Current state:** Routes are versioned as `/api/v1/...` at the URL level. There's no
version negotiation, no deprecation notices, no backward compatibility guarantees.

**For production:**
- Add `Sunset` and `Deprecation` response headers on endpoints being phased out
- Consider `Accept-Version` header-based versioning as an alternative to URL versioning
- Add API version to all response envelopes for client diagnostics

---

### 7.3 — Request ID propagation

**Current state:** Fastify reads `x-request-id` from incoming headers and uses it as the
request ID. This is correct for tracing requests across a load balancer. But the request ID
is not forwarded to outgoing HTTP calls or included in orchestrator metrics labels.

**Fix:**
- When making outbound HTTP calls (if you add them), forward `x-request-id`
- Include request ID in `OrchestratorMetrics` labels where relevant
- Correlate Prometheus metrics with Pino log lines via `requestId`

---

### 7.4 — Read replica support

Once database load grows, split reads from writes:

```bash
DATABASE_URL=postgresql://user:pass@primary:5432/db
DATABASE_READ_URL=postgresql://user:pass@replica:5432/db
```

```typescript
// src/plugins/prisma.ts
const readPrisma = new PrismaClient({
  datasources: { db: { url: fastify.config.DATABASE_READ_URL ?? fastify.config.DATABASE_URL } }
});

// Expose both on fastify
fastify.decorate('prisma', prisma);       // writes
fastify.decorate('prismRead', readPrisma); // reads
```

---

## 10. Dependency Audit

### Immediate actions

| Package | Issue | Action |
|---|---|---|
| `prisma` (devDep) | Version `^8.0.0-rc.13` (RC) conflicts with `@prisma/client@^5.7.1` | Align both to `5.22.0` |
| `@fastify/autoload` | Dependency but never imported | Remove from `package.json` |
| `pino-pretty` | In `dependencies`, not `devDependencies` | Move — never needed in production images |

**Fix `package.json`:**

```json
{
  "dependencies": {
    "@prisma/client": "5.22.0"
    // remove: pino-pretty, @fastify/autoload
  },
  "devDependencies": {
    "prisma": "5.22.0",
    "pino-pretty": "^10.3.1"
  }
}
```

### Regular hygiene
- Run `npm audit` in CI (see Phase 4.1 — it's in the CI workflow)
- Pin exact versions for security-critical packages: `bcryptjs`, `@fastify/jwt`, `@fastify/helmet`
- Set up Dependabot or Renovate for automated dependency PRs

---

## 11. Acceptance Criteria Summary

Each phase is complete when all of its acceptance criteria pass:

### Phase 0
- [ ] `git status` shows `.env` as untracked
- [ ] Docker build context < 5 MB (`docker build` takes < 10s on warm cache)
- [ ] `kill -SIGTERM <pid>` → process logs "draining", waits for in-flight requests, exits 0
- [ ] `.env.example` exists and is committed

### Phase 1
- [ ] `JWT_SECRET=short` → server fails to start with clear error
- [ ] 6 login attempts in 1 minute → 429 on attempt 6
- [ ] 5 failed logins → account locked, subsequent attempt returns "account locked" message
- [ ] `/metrics` returns 401 without `Authorization: Bearer <METRICS_TOKEN>`
- [ ] `NODE_ENV=production SWAGGER_ENABLED` not set → `/documentation` returns 404
- [ ] `curl -I http://localhost:3000` includes `Content-Security-Policy` header

### Phase 2
- [ ] All request logs for authenticated routes include `userId`
- [ ] Querying a non-existent route logs at `warn`, not `error`
- [ ] Prisma query > 500ms logs a warn with query details
- [ ] Orchestrator errors appear in Pino JSON output (not console.error)
- [ ] `GET /api/v1/ready` returns 503 when database is unavailable

### Phase 3
- [ ] `npm run test:coverage` fails if coverage drops below 80% lines
- [ ] Request traces visible in Jaeger UI at `http://localhost:16686`
- [ ] Each trace includes Prisma spans showing query duration
- [ ] Prometheus alert fires when error rate > 5% for 2 minutes

### Phase 4
- [ ] PRs to `main` trigger CI — typecheck, lint, tests, build all required green
- [ ] Merges to `main` trigger Docker image build and push to registry
- [ ] `npm audit --audit-level=high` passes in CI

### Phase 5
- [ ] `docker compose up` starts migrate service, waits for it, then starts app
- [ ] Two simultaneous app starts do NOT cause migration errors
- [ ] Expired refresh tokens cleaned up on startup and daily
- [ ] `DATABASE_URL` without `sslmode` logs a production warning

### Phase 6
- [ ] No `latest` tags in `docker-compose.yml`
- [ ] No hardcoded credentials in `docker-compose.yml`
- [ ] All services have `restart: unless-stopped`
- [ ] Production checklist variables all explicitly set

---

## Estimated Timeline

| Phase | Work | Who | Days |
|---|---|---|---|
| Phase 0 | Immediate blockers | Any engineer | 0.5 |
| Phase 1 | Security hardening | Backend engineer | 2 |
| Phase 2 | Reliability | Backend engineer | 2 |
| Phase 3 | Observability | DevOps or backend | 3 |
| Phase 4 | CI/CD | DevOps | 1.5 |
| Phase 5 | Database | Backend engineer | 1.5 |
| Phase 6 | Infrastructure | DevOps | 1 |
| Phase 7 | Scale concerns | Team decision | Ongoing |
| **Total** | | | **~12 days** |

> **Minimum viable production deployment:** Phase 0 + Phase 1 + Phase 4 CI pipeline.
> That's roughly 4 days of work and gets you to a state that is safe to ship.
