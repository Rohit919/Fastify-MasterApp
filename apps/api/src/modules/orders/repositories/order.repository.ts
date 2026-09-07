import type { PrismaClient } from '@prisma/client';

/**
 * PLACEHOLDER — OrderRepository.
 * Encapsulates all order data access. The orchestrator depends on this;
 * this depends on Prisma. Never import a module type into core.
 *
 * There is no `order` Prisma model yet — add one before implementing methods.
 */
export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Placeholder — returns the underlying client until real methods exist. */
  client(): PrismaClient {
    return this.prisma;
  }

  // create(data) { return this.prisma.order.create({ data }); }
  // findById(id) { return this.prisma.order.findUnique({ where: { id } }); }
}
