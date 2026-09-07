/**
 * PLACEHOLDER — orders domain types.
 *
 * This module is a scaffold demonstrating the full vertical-slice shape:
 *   routes → orchestrator → operations + repositories → database.
 * Fill in when the orders feature is actually built (and add a Prisma model).
 */

export interface Order {
  id: string;
  userId: string;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
}
