import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt) as (
  password: Buffer,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const ALGO = "scrypt-hmac-v1";
const SALT_BYTES = 16;
const KEY_BYTES = 64;

// Peppers the password with NEXTAUTH_SECRET via HMAC-SHA256 before handing it
// to scrypt. The secret never lands in the DB, so a DB leak alone doesn't
// enable offline cracking. Same pattern the project already uses in
// hashToken (src/lib/auth.ts) — keeping it consistent here so a future
// platform-wide password scheme can share the prehashing step.
function pepper(password: string): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET is required to hash availability passwords"
    );
  }
  return createHmac("sha256", secret).update(password).digest();
}

export async function hashAvailabilityPassword(
  password: string
): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(pepper(password), salt, KEY_BYTES);
  return `${ALGO}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyAvailabilityPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [algo, saltHex, keyHex] = stored.split("$");
  if (algo !== ALGO || !saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const derived = await scryptAsync(pepper(password), salt, expected.length);
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
