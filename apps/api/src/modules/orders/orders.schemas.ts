import { Type } from '@sinclair/typebox';

/**
 * PLACEHOLDER — orders TypeBox schemas.
 * Define request/response contracts here when the module is built.
 */
export const CreateOrderBodySchema = Type.Object({
  items: Type.Array(
    Type.Object({
      productId: Type.String(),
      quantity: Type.Integer({ minimum: 1 }),
    }),
    { minItems: 1 }
  ),
});

export const OrderResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    id: Type.String(),
    userId: Type.String(),
    status: Type.String(),
    total: Type.Number(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  }),
});
