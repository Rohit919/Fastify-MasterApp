import { createHash, randomBytes } from "node:crypto";

/** Generate a high-entropy opaque bearer token (256 bits, base64url encoded). */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/** One-way digest used before opaque session/reset tokens are persisted. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
