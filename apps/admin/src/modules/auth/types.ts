/**
 * Auth module types — re-exported from the shared contract package so the
 * frontend and backend can never diverge on auth shapes.
 */
export type {
  LoginBody,
  RegisterBody,
  AuthUser,
  AuthResponse,
  TokenPairResponse,
} from '@app/api-contracts';
