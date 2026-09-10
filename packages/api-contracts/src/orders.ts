import { Type, type Static } from "@sinclair/typebox";
import { DataEnvelope, PaginatedEnvelope, PaginationQuery } from "./common.js";

export const OrderStatus = Type.Union([
  Type.Literal("PENDING"),
  Type.Literal("PAID"),
  Type.Literal("SHIPPED"),
  Type.Literal("CANCELLED"),
]);
export type OrderStatus = Static<typeof OrderStatus>;

export const OrderItemDto = Type.Object({
  id: Type.String(),
  productId: Type.String(),
  productName: Type.String(),
  quantity: Type.Integer({ minimum: 1 }),
  unitPriceCents: Type.Integer({ minimum: 0 }),
});
export type OrderItemDto = Static<typeof OrderItemDto>;

export const OrderDto = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  status: OrderStatus,
  totalCents: Type.Integer({ minimum: 0 }),
  items: Type.Array(OrderItemDto),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});
export type OrderDto = Static<typeof OrderDto>;

export const CreateOrderBody = Type.Object({
  items: Type.Array(
    Type.Object({
      productId: Type.String({ minLength: 1, maxLength: 100 }),
      quantity: Type.Integer({ minimum: 1, maximum: 100 }),
    }),
    { minItems: 1, maxItems: 100 },
  ),
});
export type CreateOrderBody = Static<typeof CreateOrderBody>;

export const ListOrdersQuery = Type.Composite([
  PaginationQuery,
  Type.Object({ status: Type.Optional(OrderStatus) }),
]);
export type ListOrdersQuery = Static<typeof ListOrdersQuery>;

export const OrderResponse = DataEnvelope(OrderDto);
export type OrderResponse = Static<typeof OrderResponse>;
export const OrdersListResponse = PaginatedEnvelope(OrderDto);
export type OrdersListResponse = Static<typeof OrdersListResponse>;
