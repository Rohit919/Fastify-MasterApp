import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import bcrypt from 'bcryptjs';
import { ValidationError, UnauthorizedError } from '../../utils/errors.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Parse a duration string like "7d", "15m", "1h" into milliseconds. */
function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit]!;
}

/** Create a refresh token, persist it, and return the opaque token string. */
async function createRefreshToken(
  prisma: FastifyPluginAsyncTypebox extends never ? never : any,
  userId: string,
  expiresIn: string
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parseDurationMs(expiresIn));

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

// ─── shared response schemas ─────────────────────────────────────────────────

const AuthResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    accessToken: Type.String(),
    refreshToken: Type.String(),
    user: Type.Object({
      id: Type.String(),
      email: Type.String(),
      name: Type.String(),
      role: Type.String(),
    }),
  }),
});

// ─── route plugin ─────────────────────────────────────────────────────────────

const authRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // ── POST /login ────────────────────────────────────────────────────────────
  fastify.post(
    '/login',
    {
      schema: {
        description: 'User login — returns an access token (short-lived) and a refresh token',
        tags: ['Auth'],
        body: Type.Object({
          email: Type.String({ format: 'email' }),
          password: Type.String({ minLength: 6 }),
        }),
        response: {
          200: AuthResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await fastify.prisma.user.findUnique({ where: { email } });
      if (!user) throw new UnauthorizedError('Invalid credentials');

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) throw new UnauthorizedError('Invalid credentials');

      const payload = { id: user.id, email: user.email, role: user.role };
      const accessToken = fastify.jwt.sign(payload);
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

  // ── POST /register ─────────────────────────────────────────────────────────
  fastify.post(
    '/register',
    {
      schema: {
        description: 'User registration — returns an access token and a refresh token',
        tags: ['Auth'],
        body: Type.Object({
          email: Type.String({ format: 'email' }),
          password: Type.String({ minLength: 6 }),
          name: Type.String({ minLength: 1 }),
        }),
        response: {
          201: AuthResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body;

      const existing = await fastify.prisma.user.findUnique({ where: { email } });
      if (existing) throw new ValidationError('Email already registered');

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await fastify.prisma.user.create({
        data: { email, password: hashedPassword, name, role: 'user' },
      });

      const payload = { id: user.id, email: user.email, role: user.role };
      const accessToken = fastify.jwt.sign(payload);
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

  // ── POST /refresh ──────────────────────────────────────────────────────────
  fastify.post(
    '/refresh',
    {
      schema: {
        description:
          'Exchange a valid refresh token for a new access token and a rotated refresh token. The old refresh token is revoked immediately (rotation).',
        tags: ['Auth'],
        body: Type.Object({
          refreshToken: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              accessToken: Type.String(),
              refreshToken: Type.String(),
            }),
          }),
          401: Type.Object({
            success: Type.Literal(false),
            error: Type.Object({
              message: Type.String(),
              statusCode: Type.Number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      // Look up the token
      const stored = await fastify.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      // Reject if missing, already revoked, or expired
      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        return reply.status(401).send({
          success: false,
          error: { message: 'Invalid or expired refresh token', statusCode: 401 },
        });
      }

      // Revoke the used token immediately (rotation — prevents replay)
      await fastify.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      // Issue fresh tokens
      const { user } = stored;
      const payload = { id: user.id, email: user.email, role: user.role };
      const newAccessToken = fastify.jwt.sign(payload);
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

  // ── POST /logout ───────────────────────────────────────────────────────────
  fastify.post(
    '/logout',
    {
      schema: {
        description: 'Revoke a refresh token, effectively logging the client out.',
        tags: ['Auth'],
        body: Type.Object({
          refreshToken: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({ message: Type.String() }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      // Revoke silently — no error if the token doesn't exist (idempotent logout)
      await fastify.prisma.refreshToken.updateMany({
        where: { token: refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return reply.send({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    }
  );

  // ── GET /verify ────────────────────────────────────────────────────────────
  fastify.get(
    '/verify',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Verify the current access token and return the decoded payload.',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: Type.Object({
            success: Type.Literal(true),
            data: Type.Object({
              user: Type.Object({
                id: Type.String(),
                email: Type.String(),
                role: Type.String(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      return reply.send({ success: true, data: { user: request.user } });
    }
  );
};

export default authRoutes;
