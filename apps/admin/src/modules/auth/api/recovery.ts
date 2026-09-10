import { apiClient } from "@/lib/api-client";
import {
  API_CONTRACTS,
  type MessageResponse,
  type ResetTokenResponse,
} from "@app/api-contracts";

export async function forgotPassword(email: string) {
  const response = await apiClient.request<MessageResponse>(
    API_CONTRACTS.AUTH.FORGOT_PASSWORD,
    {
      body: { email },
    },
  );
  return response.data;
}

export async function verifyResetOtp(email: string, otp: string) {
  const response = await apiClient.request<ResetTokenResponse>(
    API_CONTRACTS.AUTH.VERIFY_RESET_OTP,
    {
      body: { email, otp },
    },
  );
  return response.data;
}

export async function resetPassword(resetToken: string, newPassword: string) {
  const response = await apiClient.request<MessageResponse>(
    API_CONTRACTS.AUTH.RESET_PASSWORD,
    {
      body: { resetToken, newPassword },
    },
  );
  return response.data;
}

export async function verifyEmail(email: string, otp: string) {
  const response = await apiClient.request<MessageResponse>(
    API_CONTRACTS.AUTH.VERIFY_EMAIL,
    {
      body: { email, otp },
    },
  );
  return response.data;
}

export async function resendVerification(email: string) {
  const response = await apiClient.request<MessageResponse>(
    API_CONTRACTS.AUTH.RESEND_VERIFICATION,
    {
      body: { email },
    },
  );
  return response.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const response = await apiClient.request<MessageResponse>(
    API_CONTRACTS.AUTH.CHANGE_PASSWORD,
    {
      body: { currentPassword, newPassword },
    },
  );
  return response.data;
}
