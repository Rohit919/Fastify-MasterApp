import type { CreateOrderContext } from "../orders.types.js";

export async function validateOrder(
  context: CreateOrderContext,
): Promise<CreateOrderContext> {
  if (context.input.items.length === 0)
    throw new Error("An order needs at least one item");
  const ids = new Set<string>();
  for (const item of context.input.items) {
    if (!item.productId.trim())
      throw new Error("Every item needs a product id");
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 100
    ) {
      throw new Error("Item quantity must be an integer between 1 and 100");
    }
    if (ids.has(item.productId))
      throw new Error("Duplicate products are not allowed");
    ids.add(item.productId);
  }
  return context;
}
