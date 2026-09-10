import type { OrderStatus, PrismaClient } from "@prisma/client";
import { ConflictError, NotFoundError } from "@core/errors/index.js";

const includeItems = { items: true } as const;

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(input: {
    userId?: string;
    status?: OrderStatus;
    skip: number;
    take: number;
  }) {
    const where = {
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    return Promise.all([
      this.prisma.order.findMany({
        where,
        include: includeItems,
        orderBy: { createdAt: "desc" },
        skip: input.skip,
        take: input.take,
      }),
      this.prisma.order.count({ where }),
    ]);
  }

  getById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: includeItems,
    });
  }

  async cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      if (changed.count !== 1) {
        const current = await tx.order.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!current) throw new NotFoundError("Order not found");
        throw new ConflictError(
          `Only pending orders can be cancelled (current: ${current.status})`,
        );
      }
      return tx.order.findUniqueOrThrow({
        where: { id },
        include: includeItems,
      });
    });
  }
}
