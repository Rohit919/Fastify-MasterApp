import { Type, type Static } from '@sinclair/typebox';

/**
 * Auth contracts — shared between the Fastify API and the React admin.
 */

// ── Requests ──────────────────────────────────────────────────────────────────
export const LoginBody = Type.Object({
  email: Type.String({ format: 'email', maxLength: 254 }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
});
export type LoginBody = Static<typeof LoginBody>;

export const RegisterBody = Type.Object({
  email: Type.String({ format: 'email', maxLength: 254 }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
});
export type RegisterBody = Static<typeof RegisterBody>;

export const RefreshBody = Type.Object({
  refreshToken: Type.String(),
});
export type RefreshBody = Static<typeof RefreshBody>;

export const LogoutBody = Type.Object({
  refreshToken: Type.String(),
});
export type LogoutBody = Static<typeof LogoutBody>;

// ── Response shapes ─────────────────────────────────────────────────────────────
export const AuthUser = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  role: Type.String(),
});
export type AuthUser = Static<typeof AuthUser>;

export const AuthResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    accessToken: Type.String(),
    refreshToken: Type.String(),
    user: AuthUser,
  }),
});
export type AuthResponse = Static<typeof AuthResponse>;

export const TokenPairResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    accessToken: Type.String(),
    refreshToken: Type.String(),
  }),
});
export type TokenPairResponse = Static<typeof TokenPairResponse>;

export const VerifyResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    user: Type.Object({
      id: Type.String(),
      email: Type.String(),
      role: Type.String(),
    }),
  }),
});
export type VerifyResponse = Static<typeof VerifyResponse>;

export const LogoutResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({ message: Type.String() }),
});
export type LogoutResponse = Static<typeof LogoutResponse>;
