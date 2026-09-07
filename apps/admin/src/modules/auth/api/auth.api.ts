import { apiClient } from '@/lib/api-client';
import {
  API_ENDPOINTS,
  type LoginBody,
  type AuthResponse,
  type ForgotPasswordBody,
  type VerifyResetOtpBody,
  type ResetPasswordBody,
  type ResetTokenResponse,
  type ChangePasswordBody,
} from '@app/api-contracts';

/**
 * Centralized auth API service. All auth HTTP calls live here and go through
 * the shared api client + contract endpoint registry — no hardcoded URLs.
 *
 * Backend reality (see apps/api auth routes):
 * - Login is email + password (NO OTP on login).
 * - OTP is used only for the password-reset flow:
 *     forgot-password → email OTP
 *     password-reset/verify → exchange OTP for a single-use resetToken
 *     password-reset/confirm → set the new password with the resetToken
 * - The refresh token is an HTTP-only cookie; refresh/logout carry no body.
 */

type LoginData = AuthResponse['data'];

export const authApi = {
  login: (body: LoginBody): Promise<LoginData> =>
    apiClient.post<LoginData>(API_ENDPOINTS.AUTH.LOGIN, body, true),

  logout: (): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.LOGOUT, {}, true),

  logoutAll: (): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.LOGOUT_ALL, {}),

  forgotPassword: (body: ForgotPasswordBody): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, body, true),

  verifyResetOtp: (body: VerifyResetOtpBody): Promise<ResetTokenResponse['data']> =>
    apiClient.post<ResetTokenResponse['data']>(API_ENDPOINTS.AUTH.VERIFY_RESET_OTP, body, true),

  resetPassword: (body: ResetPasswordBody): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.RESET_PASSWORD, body, true),

  changePassword: (body: ChangePasswordBody): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, body),
};
