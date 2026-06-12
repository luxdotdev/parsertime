import { databaseUrlWithPoolDefaults } from "@/lib/prisma";
import { describe, expect, test } from "vitest";

describe("databaseUrlWithPoolDefaults", () => {
  test("appends pool params to a URL that already has query params", () => {
    const url = databaseUrlWithPoolDefaults(
      "postgresql://user:pass@db.example.com:5432/app?sslmode=verify-full&sslrootcert=system"
    )!;
    const parsed = new URL(url);
    expect(parsed.searchParams.get("connection_limit")).toBe("15");
    expect(parsed.searchParams.get("pool_timeout")).toBe("20");
    expect(parsed.searchParams.get("sslmode")).toBe("verify-full");
    expect(parsed.searchParams.get("sslrootcert")).toBe("system");
  });

  test("explicit values in the URL win over the defaults", () => {
    const url = databaseUrlWithPoolDefaults(
      "postgresql://user:pass@db.example.com:5432/app?connection_limit=30"
    )!;
    const parsed = new URL(url);
    expect(parsed.searchParams.get("connection_limit")).toBe("30");
    expect(parsed.searchParams.get("pool_timeout")).toBe("20");
  });

  test("handles a bare URL with no query params", () => {
    const url = databaseUrlWithPoolDefaults(
      "postgresql://user:pass@db.example.com:5432/app"
    )!;
    expect(new URL(url).searchParams.get("connection_limit")).toBe("15");
  });

  test("passes through undefined and unparseable values", () => {
    expect(databaseUrlWithPoolDefaults(undefined)).toBeUndefined();
    expect(databaseUrlWithPoolDefaults("not a url")).toBe("not a url");
  });
});
