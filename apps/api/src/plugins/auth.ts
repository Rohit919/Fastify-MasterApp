import fp from 'fastify-plugin';
import fastifyAuth from '@fastify/auth';
import fastifyJWT from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '@core/errors/index.js';

// JWT payload type
export interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

// Extend JWT namespace
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Fail fast on a weak secret — belt-and-suspenders alongside the env schema minLength.
  if (fastify.config.JWT_SECRET.length < 32) {
    throw new Error(
      `JWT_SECRET is too short (${fastify.config.JWT_SECRET.length} chars). ` +
        'Minimum is 32. Generate one with: openssl rand -hex 32'
    );
  }

  // Register JWT plugin — pin HS256 on both sign and verify to block the alg:none attack.
  await fastify.register(fastifyJWT, {
    secret: fastify.config.JWT_SECRET,
    sign: {
      algorithm: 'HS256',
      expiresIn: fastify.config.JWT_EXPIRES_IN,
    },
    verify: {
      algorithms: ['HS256'],
    },
  });

  // Register auth plugin
  await fastify.register(fastifyAuth);

  // Authentication decorator.
  // Throws UnauthorizedError so the global error handler emits the canonical
  // envelope with the stable UNAUTHORIZED code (API_CONVENTIONS §39).
  fastify.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError();
    }
  });

  // Authorization decorator (example for role-based auth).
  fastify.decorate('authorize', (roles: string[]) => {
    return async function (request: FastifyRequest, _reply: FastifyReply) {
      if (!request.user) {
        throw new UnauthorizedError();
      }

      if (!roles.includes(request.user.role)) {
        throw new ForbiddenError();
      }
    };
  });
};

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['env'],
});
