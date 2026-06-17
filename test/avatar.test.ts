import {
  AVATAR_PREFIXES,
  canUploadBanner,
  getBaseUrl,
  imageKey,
  imageProxyPath,
  isImageKind,
  isVercelBlobUrl,
} from "@/lib/avatar";
import { $Enums } from "@/generated/prisma/browser";
import { describe, expect, it } from "vitest";

describe("avatar helpers", () => {
  it("builds R2 keys per kind", () => {
    expect(imageKey("avatar", "user_123")).toBe("avatars/user_123.png");
    expect(imageKey("banner", "user_123")).toBe("banners/user_123.png");
    expect(imageKey("team", "42")).toBe("team-avatars/42.png");
  });

  it("builds a relative, cache-busted proxy path", () => {
    expect(imageProxyPath("avatar", "user_123", 1700000000000)).toBe(
      "/api/image/avatar/user_123?v=1700000000000"
    );
  });

  it("validates image kinds against the whitelist", () => {
    expect(isImageKind("avatar")).toBe(true);
    expect(isImageKind("team")).toBe(true);
    expect(isImageKind("map-images")).toBe(false);
    expect(isImageKind("../secrets")).toBe(false);
    expect(Object.keys(AVATAR_PREFIXES)).toEqual(["avatar", "banner", "team"]);
  });

  it("detects Vercel Blob URLs", () => {
    expect(
      isVercelBlobUrl(
        "https://s2qw9udutrlis7qk.public.blob.vercel-storage.com/avatars/x.png"
      )
    ).toBe(true);
    expect(isVercelBlobUrl("/api/image/avatar/x?v=1")).toBe(false);
    expect(isVercelBlobUrl(null)).toBe(false);
    expect(isVercelBlobUrl("not a url")).toBe(false);
  });

  it("allows premium or admin to upload a banner", () => {
    expect(
      canUploadBanner({
        billingPlan: $Enums.BillingPlan.PREMIUM,
        role: $Enums.UserRole.USER,
      })
    ).toBe(true);
    expect(
      canUploadBanner({
        billingPlan: $Enums.BillingPlan.FREE,
        role: $Enums.UserRole.ADMIN,
      })
    ).toBe(true);
    expect(
      canUploadBanner({
        billingPlan: $Enums.BillingPlan.FREE,
        role: $Enums.UserRole.USER,
      })
    ).toBe(false);
  });

  it("falls back to the production base URL", () => {
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NEXTAUTH_URL;
    delete env.NEXTAUTH_URL;
    expect(getBaseUrl()).toBe("https://parsertime.app");
    env.NEXTAUTH_URL = "https://example.com/";
    expect(getBaseUrl()).toBe("https://example.com");
    env.NEXTAUTH_URL = prev;
  });
});
