/**
 * Auth module schemas.
 * Sourced from the shared @app/api-contracts package so the API and the admin
 * frontend validate against the exact same TypeBox definitions.
 */
export {
  LoginBody as LoginBodySchema,
  RegisterBody as RegisterBodySchema,
  RefreshBody as RefreshBodySchema,
  LogoutBody as LogoutBodySchema,
  AuthResponse as AuthResponseSchema,
  TokenPairResponse as TokenPairResponseSchema,
  VerifyResponse as VerifyResponseSchema,
  LogoutResponse as LogoutResponseSchema,
  ErrorEnvelope as ErrorResponseSchema,
} from '@app/api-contracts';
