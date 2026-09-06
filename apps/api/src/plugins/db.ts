import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify, _options) => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  // Connect to database
  await prisma.$connect();

  // Decorate Fastify instance with Prisma client
  fastify.decorate('prisma', prisma);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};

// Keep the Fastify plugin name as 'prisma' — other plugins declare
// `dependencies: ['prisma']` and the test harness relies on it.
export default fp(dbPlugin, {
  name: 'prisma',
});
