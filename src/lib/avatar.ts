import { $Enums, type User } from "@/generated/prisma/browser";

export const AVATAR_PREFIXES = {
  avatar: "avatars",
  banner: "banners",
  team: "team-avatars",
} as const;

export type ImageKind = keyof typeof AVATAR_PREFIXES;

export function isImageKind(value: string): value is ImageKind {
  return Object.prototype.hasOwnProperty.call(AVATAR_PREFIXES, value);
}

/** R2 object key for a given image kind + id. */
export function imageKey(kind: ImageKind, id: string): string {
  return `${AVATAR_PREFIXES[kind]}/${id}.png`;
}

/** Relative, same-origin, cache-busted path the DB stores and `<Image>` renders. */
export function imageProxyPath(
  kind: ImageKind,
  id: string,
  version: number
): string {
  return `/api/image/${kind}/${id}?v=${version}`;
}

/** Canonical site base URL for the few server contexts that need absolute URLs. */
export function getBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://parsertime.app"
  );
}

/** True when a stored value still points at Vercel Blob (used by backfill/verify). */
export function isVercelBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function canUploadBanner(
  user: Pick<User, "billingPlan" | "role">
): boolean {
  return (
    user.billingPlan === $Enums.BillingPlan.PREMIUM ||
    user.role === $Enums.UserRole.ADMIN
  );
}
