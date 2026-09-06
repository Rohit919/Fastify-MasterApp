import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Pure operation: hash a plaintext password with bcrypt.
 * Kept as a standalone function so it can be unit-tested and reused
 * across the auth orchestrator and any admin user-creation flow.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}
