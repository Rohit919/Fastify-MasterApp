import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { ValidationError, UnauthorizedError } from '@core/errors/index.js';
import { parseDurationMs } from '@core/utils/index.js';
import { hashPassword, verifyPassword } from './operations/index.js';
import {
  LoginBodySchema,
  RegisterBodySchema,
  RefreshBodySchema,
  LogoutBodySchema,
  AuthResponseSchema,
  TokenPairResponseSchema,
  VerifyResponseSchema,
  LogoutResponseSchema,
  ErrorResponseSchema,
} from './auth.schemas.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function createRefreshToken(
  prisma: FastifyPluginAsyncTypebox extends never ? never : any,
  userId: string,
  expiresIn: string
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parseDurationMs(expiresIn));
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

// ─── plugin ───────────────────────────────────────────────────────────────────

const authRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // ── POST /login ─────────────────────────────────────────────────────────────
  fastify.post(
    '/login',
    {
      schema: {
        description: 'Login — returns short-lived access token and a refresh token',
        tags: ['Auth'],
        body: LoginBodySchema,
        response: { 200: AuthResponseSchema },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await fastify.prisma.user.findUnique({ where: { email } });
      if (!user) throw new UnauthorizedError('Invalid credentials');

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) throw new UnauthorizedError('Invalid credentials');

      const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });
      const refreshToken = await createRefreshToken(
        fastify.prisma,
        user.id,
        fastify.config.REFRESH_TOKEN_EXPIRES_IN
      );

      return reply.send({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
        },
      });
    }
  );

  // ── POST /register ───────────────────────────────────────────────────────────
  fastify.post(
    '/register',
    {
      schema: {
        description: 'Register a new account',
        tags: ['Auth'],
        body: RegisterBodySchema,
        response: { 201: AuthResponseSchema },
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body;

      const existing = await fastify.prisma.user.findUnique({ where: { email } });
      if (existing) throw new ValidationError('Email already registered');

      const hashedPassword = await hashPassword(password);
      const user = await fastify.prisma.user.create({
        data: { email, password: hashedPassword, name, role: 'user' },
      });

      const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });
      const refreshToken = await createRefreshToken(
        fastify.prisma,
        user.id,
        fastify.config.REFRESH_TOKEN_EXPIRES_IN
      );

      return reply.status(201).send({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
        },
      });
    }
  );

  // ── POST /refresh ────────────────────────────────────────────────────────────
  fastify.post(
    '/refresh',
    {
      schema: {
        description: 'Rotate refresh token — revokes old token and issues new pair',
        tags: ['Auth'],
        body: RefreshBodySchema,
        response: {
          200: TokenPairResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      const stored = await fastify.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        return reply.status(401).send({
          success: false,
          error: { message: 'Invalid or expired refresh token', statusCode: 401 },
        });
      }

      await fastify.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const { user } = stored;
      const newAccessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });
      const newRefreshToken = await createRefreshToken(
        fastify.prisma,
        user.id,
        fastify.config.REFRESH_TOKEN_EXPIRES_IN
      );

      return reply.send({
        success: true,
        data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
      });
    }
  );

  // ── POST /logout ─────────────────────────────────────────────────────────────
  fastify.post(
    '/logout',
    {
      schema: {
        description: 'Revoke a refresh token — idempotent',
        tags: ['Auth'],
        body: LogoutBodySchema,
        response: { 200: LogoutResponseSchema },
      },
    },
    async (request, reply) => {
      await fastify.prisma.refreshToken.updateMany({
        where: { token: request.body.refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return reply.send({ success: true, data: { message: 'Logged out successfully' } });
    }
  );

  // ── GET /verify ──────────────────────────────────────────────────────────────
  fastify.get(
    '/verify',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Verify the current access token',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: { 200: VerifyResponseSchema },
      },
    },
    async (request, reply) => {
      return reply.send({ success: true, data: { user: request.user } });
    }
  );
};

export default authRoutes;
