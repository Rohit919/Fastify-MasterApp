import type { PrismaClient } from '@prisma/client';

/**
 * PLACEHOLDER — UserRepository for the users module.
 *
 * Adopt when user data access grows beyond the single `findUnique` in
 * users.routes.ts. Keeps SQL/ORM details out of the route and orchestrator.
 */
export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
