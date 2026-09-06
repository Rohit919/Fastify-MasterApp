import bcrypt from 'bcryptjs';

/**
 * Pure operation: compare a plaintext password against a bcrypt hash.
 * Returns true if they match, false otherwise.
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
