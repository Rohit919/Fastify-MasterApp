import { create } from 'zustand';

/**
 * Ephemeral state for the multi-step password-reset flow
 * (forgot → verify OTP → set new password). Not persisted — it only needs to
 * survive in-session navigation between the three steps. Cleared on completion.
 */
interface PasswordResetState {
  email: string | null;
  resetToken: string | null;
  setEmail: (email: string) => void;
  setResetToken: (token: string) => void;
  reset: () => void;
}

export const usePasswordResetStore = create<PasswordResetState>((set) => ({
  email: null,
  resetToken: null,
  setEmail: (email) => set({ email }),
  setResetToken: (resetToken) => set({ resetToken }),
  reset: () => set({ email: null, resetToken: null }),
}));
