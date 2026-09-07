import { Type, type Static } from '@sinclair/typebox';

/**
 * Shared response envelopes used across all modules.
 * Both the API (Fastify response schemas) and the admin (response typing)
 * import from here so the contract can never drift.
 */

export const ErrorEnvelope = Type.Object({
  success: Type.Literal(false),
  error: Type.Object({
    message: Type.String(),
    statusCode: Type.Number(),
    requestId: Type.Optional(Type.String()),
    timestamp: Type.Optional(Type.String()),
    details: Type.Optional(Type.Unknown()),
  }),
});
export type ErrorEnvelope = Static<typeof ErrorEnvelope>;

/** Wrap a data schema in the standard success envelope. */
export function SuccessEnvelope<T extends ReturnType<typeof Type.Object>>(data: T) {
  return Type.Object({
    success: Type.Literal(true),
    data,
  });
}

export const UserRole = Type.Union([
  Type.Literal('admin'),
  Type.Literal('support'),
  Type.Literal('viewer'),
  Type.Literal('user'),
]);
export type UserRole = Static<typeof UserRole>;
