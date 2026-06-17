import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveUsageEnv } from "@/lib/usage/env";

describe("resolveUsageEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("maps VERCEL_ENV=production to PRODUCTION", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(resolveUsageEnv()).toBe("PRODUCTION");
  });
  it("maps VERCEL_ENV=preview to PREVIEW", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(resolveUsageEnv()).toBe("PREVIEW");
  });
  it("falls back to DEVELOPMENT when VERCEL_ENV is unset", () => {
    vi.stubEnv("VERCEL_ENV", "");
    expect(resolveUsageEnv()).toBe("DEVELOPMENT");
  });
});
