import { describe, expect, it, vi } from "vitest";
import { PermissionKeys } from "@app/api-contracts";
import { buildTestApp, signTestToken } from "@core/testing/test-app.js";

const NOW = new Date();
const ORDER = {
  id: "order-1",
  userId: "user-test-id",
  status: "PENDING",
  totalCents: 3_800,
  idempotencyKey: null,
  createdAt: NOW,
  updatedAt: NOW,
  items: [
    {
      id: "item-1",
      orderId: "order-1",
      productId: "product-1",
      productName: "Starter Plan",
      quantity: 2,
      unitPriceCents: 1_900,
    },
  ],
};

describe("orders API", () => {
  it("lists only the caller orders without orders.read_all", async () => {
    const findMany = vi.fn().mockResolvedValue([ORDER]);
    const app = await buildTestApp({
      permissions: [PermissionKeys.OrdersRead],
      prisma: { order: { findMany, count: vi.fn().mockResolvedValue(1) } },
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/orders",
      headers: { authorization: `Bearer ${signTestToken(app)}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-test-id" }),
      }),
    );
    await app.close();
  });

  it("creates a server-priced order", async () => {
    const create = vi.fn().mockResolvedValue(ORDER);
    const app = await buildTestApp({
      permissions: [PermissionKeys.OrdersCreate],
      prisma: {
        product: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: "product-1", name: "Starter Plan", priceCents: 1_900 },
            ]),
        },
        order: { create },
      },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: {
        authorization: `Bearer ${signTestToken(app)}`,
        "idempotency-key": "checkout-1",
      },
      payload: { items: [{ productId: "product-1", quantity: 2 }] },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().data.totalCents).toBe(3_800);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalCents: 3_800,
          idempotencyKey: "checkout-1",
        }),
      }),
    );
    await app.close();
  });

  it("denies reading another user order", async () => {
    const app = await buildTestApp({
      permissions: [PermissionKeys.OrdersRead],
      prisma: {
        order: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ ...ORDER, userId: "someone-else" }),
        },
      },
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/orders/order-1",
      headers: { authorization: `Bearer ${signTestToken(app)}` },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
    await app.close();
  });
});
