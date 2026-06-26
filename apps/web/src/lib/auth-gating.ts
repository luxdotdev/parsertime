import {
  newSuspiciousActivityWebhookConstructor,
  sendDiscordWebhook,
} from "@/lib/webhooks";
import { rateLimitHitCounter } from "@/lib/axiom/metrics";
import { Logger } from "@/lib/logger";
import type { User } from "@/generated/prisma/client";
import { Ratelimit } from "@upstash/ratelimit";
import { get } from "@vercel/edge-config";
import { kv } from "@vercel/kv";
import { APIError } from "better-auth/api";

const isProd = process.env.NODE_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview";

type Availability = "public" | "private";

/**
 * Deny blocked users, and during private availability only allow lux.dev
 * addresses or the edge-config allow-list. Throws an APIError to deny.
 * No-op outside production (all sign-ins allowed in dev).
 */
export async function assertUserAllowed(email: string | null | undefined) {
  if (!isProd) return; // allow all sign ins in dev

  if (!email) {
    throw new APIError("FORBIDDEN", { message: "Email is required" });
  }

  const blockedUsers = (await get<string[]>("blockedUsers")) ?? [];
  if (blockedUsers.includes(email)) {
    Logger.warn(`User sign-in blocked: ${email}`);
    throw new APIError("FORBIDDEN", { message: "Access denied" });
  }

  const status = (await get<Availability>("availability")) ?? "private";
  if (status === "public" && !isPreview) return;

  const allowedUsers = (await get<string[]>("allowedUsers")) ?? [];
  if (email.toLowerCase().endsWith("@lux.dev")) return;
  if (allowedUsers.includes(email)) return;

  Logger.warn(`User not authorized for private access: ${email}`);
  throw new APIError("FORBIDDEN", { message: "Not authorized for access" });
}

/**
 * Apply the sliding-window sign-in rate limit. On breach, fire the
 * suspicious-activity webhook and throw to abort the sign-in.
 */
export async function enforceSignInRateLimit(user: {
  id?: string;
  email?: string | null;
  name?: string | null;
}) {
  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });

  const identifier = user.email ?? "unknown";
  const { success } = await ratelimit.limit(identifier);
  if (success) return;

  rateLimitHitCounter.add(1, { endpoint: "auth.signin" });
  Logger.warn(`Rate limit exceeded for sign in attempt: ${identifier}`);

  // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions
  const userObj = {
    name: user.name ?? "Unknown",
    email: user.email ?? "unknown",
    id: user.id ?? "unknown",
  } as User;

  const wh = newSuspiciousActivityWebhookConstructor(
    userObj,
    "Sign in (rate limit exceeded)",
    "",
    { name: "", version: "" },
    { name: "", version: "" },
    {}
  );
  await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, wh);

  throw new APIError("TOO_MANY_REQUESTS", { message: "Rate limit exceeded" });
}
