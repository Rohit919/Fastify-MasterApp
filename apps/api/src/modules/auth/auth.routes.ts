import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import type { FastifyRequest } from 'fastify';
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

// ─── constants ────────────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min

// Timing-safe "user not found" — a valid bcrypt hash that will always fail.
// bcrypt.compare against this takes the same time as comparing against a real hash,
// preventing timing attacks that reveal whether an email is registered.
const FAKE_HASH = '$2b$10$abcdefghijklmnopqrstuuEFGHIJKLMNOPQRSTUVWXYZabcde';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function createRefreshToken(
  prisma: FastifyPluginAsyncTypebox extends never ? never : any,
  userId: string,
  expiresIn: string,
  family?: string,
): Promise<{ token: string; family: string }> {
  const token = crypto.randomUUID();
  const tokenFamily = family ?? crypto.randomUUID(); // new login = new family
  const expiresAt = new Date(Date.now() + parseDurationMs(expiresIn));
  await prisma.refreshToken.create({ data: { token, family: tokenFamily, userId, expiresAt } });
  return { token, family: tokenFamily };
}

// ─── plugin ───────────────────────────────────────────────────────────────────

const authRoutes: FastifyPluginAsyncTypebox = async (fastify) => {

  // ── POST /login ─────────────────────────────────────────────────────────────
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
          keyGenerator: (req: FastifyRequest) => {
            const email = (req.body as { email?: string } | undefined)?.email;
            return `login:${(email ?? req.ip).toLowerCase()}`;
          },
        },
      },
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

      if (!user) {
        // Timing-safe: still run bcrypt so response time matches a wrong-password path.
        await verifyPassword(password, FAKE_HASH);
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check lockout BEFORE bcrypt (saves the expensive compare on locked accounts)
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const retryAfter = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
        return reply.status(429).send({
          success: false,
          error: {
            message: 'Account temporarily locked. Try again later.',
            statusCode: 429,
            retryAfter,
          },
        } as never);
      }

      const isValid = await verifyPassword(password, user.password);

      if (!isValid) {
        const newAttempts = user.failedLoginAttempts + 1;
        const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

        await fastify.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            ...(shouldLock ? { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) } : {}),
          },
        });

        throw new UnauthorizedError('Invalid credentials');
      }

      // Success — reset lockout counters
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
      });

      const accessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });
      const { token: refreshToken } = await createRefreshToken(
        fastify.prisma,
        user.id,
        fastify.config.REFRESH_TOKEN_EXPIRES_IN,
        // undefined = new family for this login session
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
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 hour',
          keyGenerator: (req: FastifyRequest) => `register:${req.ip}`,
        },
      },
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
      const { token: refreshToken } = await createRefreshToken(
        fastify.prisma,
        user.id,
        fastify.config.REFRESH_TOKEN_EXPIRES_IN,
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
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          keyGenerator: (req: FastifyRequest) => {
            const rt = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
            return `refresh:${rt?.slice(0, 8) ?? req.ip}`;
          },
        },
      },
      schema: {
        description: 'Rotate refresh token (token family detection)',
        tags: ['Auth'],
        body: RefreshBodySchema,
        response: { 200: TokenPairResponseSchema, 401: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      const stored = await fastify.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!stored) {
        return reply.status(401).send({
          success: false,
          error: { message: 'Invalid refresh token', statusCode: 401 },
        });
      }

      // ── Stolen token detection ────────────────────────────────────────────
      // If this token is already revoked, someone re-used a superseded token.
      // Revoke the ENTIRE family — both the attacker and the legitimate user
      // lose their sessions. Force re-login.
      if (stored.revokedAt) {
        await fastify.prisma.refreshToken.updateMany({
          where: { family: stored.family, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        fastify.log.warn(
          { userId: stored.userId, family: stored.family },
          'Refresh token reuse detected — session family revoked'
        );
        return reply.status(401).send({
          success: false,
          error: {
            message: 'Session invalidated due to suspicious activity. Please log in again.',
            statusCode: 401,
          },
        });
      }

      if (stored.expiresAt < new Date()) {
        return reply.status(401).send({
          success: false,
          error: { message: 'Refresh token expired', statusCode: 401 },
        });
      }

      // Revoke current token and issue a new one in the SAME family.
      await fastify.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const { user } = stored;
      const newAccessToken = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });
      const { token: newRefreshToken } = await createRefreshToken(
        fastify.prisma,
        user.id,
        fastify.config.REFRESH_TOKEN_EXPIRES_IN,
        stored.family, // continue the same family
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
