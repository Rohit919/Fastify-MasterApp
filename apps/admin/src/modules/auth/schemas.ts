import { z } from 'zod';

/**
 * Client-side validation schemas for auth forms. These mirror the backend
 * TypeBox contracts (email format, 8–128 char password, 6-digit OTP) for a
 * fast UX; the backend remains the authoritative validator.
 *
 * Messages are i18n keys resolved by the form via the `validation` namespace.
 */
export const loginSchema = z.object({
  email: z.string().min(1, 'validation:required').email('validation:email'),
  password: z.string().min(1, 'validation:required'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'validation:required').email('validation:email'),
});
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const verifyOtpSchema = z.object({
  otp: z.string().regex(/^[0-9]{6}$/, 'validation:otpFormat'),
});
export type VerifyOtpForm = z.infer<typeof verifyOtpSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'validation:passwordMin').max(128, 'validation:maxLength'),
    confirmPassword: z.string().min(1, 'validation:required'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'validation:passwordsMatch',
    path: ['confirmPassword'],
  });
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'validation:required'),
    newPassword: z.string().min(8, 'validation:passwordMin').max(128, 'validation:maxLength'),
    confirmPassword: z.string().min(1, 'validation:required'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'validation:passwordsMatch',
    path: ['confirmPassword'],
  });
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
