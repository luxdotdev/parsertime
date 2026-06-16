import { randomBytes } from "crypto";

export function generateRandomToken(): string {
  return randomBytes(32).toString("base64url");
}
