# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps: install production + dev deps (cached layer)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app

# Copy workspace manifests first so the npm ci layer is cached until they change.
COPY package.json package-lock.json ./
COPY packages/api-contracts/package.json ./packages/api-contracts/
COPY apps/api/package.json ./apps/api/

# Install all deps (including devDeps needed for the build step).
RUN npm ci --ignore-scripts

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — builder: compile TypeScript → dist/
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

# Re-use installed node_modules from deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy source (respects .dockerignore — no .env, no admin, no tests).
COPY packages/api-contracts/ ./packages/api-contracts/
COPY apps/api/ ./apps/api/
COPY prisma/ ./prisma/
COPY package.json package-lock.json ./

# Build shared contracts then the API.
RUN npm run build:contracts
RUN npm run build --workspace @app/api

# Generate Prisma client into dist so the runtime image has it.
RUN npx prisma generate

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — prod-deps: install production-only dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/api-contracts/package.json ./packages/api-contracts/
COPY apps/api/package.json ./apps/api/

RUN npm ci --omit=dev --ignore-scripts

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4 — runtime: distroless — no shell, no package manager, non-root user
#
# gcr.io/distroless/nodejs20-debian12 includes only Node.js + ca-certs.
# The "nonroot" tag drops to UID 65532 (nobody) — no root access at runtime.
# ─────────────────────────────────────────────────────────────────────────────
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime

# OCI standard labels.
ARG COMMIT_SHA=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.revision="${COMMIT_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/Rohit919/Fastify-MasterApp" \
      org.opencontainers.image.title="fastify-api" \
      org.opencontainers.image.description="Fastify REST API — production image"

WORKDIR /app

# Production node_modules from prod-deps stage (npm workspaces hoists to root).
COPY --from=prod-deps /app/node_modules ./node_modules

# Compiled output + Prisma client from builder stage.
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Prisma schema needed at runtime for migration checks.
COPY --from=builder /app/prisma ./prisma

# Pass commit SHA through to the app for version tagging in logs/traces.
ENV COMMIT_SHA=${COMMIT_SHA} \
    NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Distroless uses the node binary directly — no shell wrapper.
# server.js is the compiled ESM entrypoint produced by tsup.
CMD ["/app/apps/api/dist/server.js"]
