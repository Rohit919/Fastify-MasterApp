-- Security migration: existing refresh tokens contain replayable bearer values.
-- Revoke them all, then replace the raw token column with a one-way digest.
DELETE FROM "refresh_tokens";
ALTER TABLE "refresh_tokens" DROP COLUMN "token";
ALTER TABLE "refresh_tokens" ADD COLUMN "tokenHash" TEXT NOT NULL;
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- Give todos database-enforced ownership and optional request idempotency.
-- Remove historical orphan rows before introducing the foreign key.
DELETE FROM "todos" t
WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = t."userId");
ALTER TABLE "todos" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "todos_userId_idempotencyKey_key"
  ON "todos"("userId", "idempotencyKey");
ALTER TABLE "todos"
  ADD CONSTRAINT "todos_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Orders.
CREATE TYPE "order_status" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'CANCELLED');
CREATE TABLE "orders" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "order_status" NOT NULL DEFAULT 'PENDING',
  "totalCents" INTEGER NOT NULL,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "products" (
  "id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "order_items" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceCents" INTEGER NOT NULL,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE UNIQUE INDEX "orders_userId_idempotencyKey_key"
  ON "orders"("userId", "idempotencyKey");
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Transactional outbox.
CREATE TYPE "outbox_status" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED');
CREATE TABLE "outbox_events" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "outbox_status" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "outbox_events_status_availableAt_idx"
  ON "outbox_events"("status", "availableAt");
CREATE INDEX "outbox_events_aggregateId_idx" ON "outbox_events"("aggregateId");
