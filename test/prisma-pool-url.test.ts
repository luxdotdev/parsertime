import { poolOptionsFromUrl } from "@/lib/prisma";
import { describe, expect, test } from "vitest";

describe("poolOptionsFromUrl", () => {
  test("applies pool defaults when the URL has none", () => {
    const opts = poolOptionsFromUrl(
      "postgresql://user:pass@db.example.com:5432/app?sslmode=verify-full&sslrootcert=system"
    );
    expect(opts.max).toBe(15);
    expect(opts.connectionTimeoutMillis).toBe(20_000);
    expect(opts.idleTimeoutMillis).toBe(300_000);
    const parsed = new URL(opts.connectionString!);
    expect(parsed.searchParams.get("sslmode")).toBe("verify-full");
    expect(parsed.searchParams.get("sslrootcert")).toBe("system");
  });

  test("explicit URL params win and are stripped from the connection string", () => {
    const opts = poolOptionsFromUrl(
      "postgresql://user:pass@db.example.com:5432/app?connection_limit=30&pool_timeout=5"
    );
    expect(opts.max).toBe(30);
    expect(opts.connectionTimeoutMillis).toBe(5_000);
    expect(opts.connectionString).toBe(
      "postgresql://user:pass@db.example.com:5432/app"
    );
  });

  test("preserves other query params while stripping pool params", () => {
    const opts = poolOptionsFromUrl(
      "postgresql://user:pass@db.example.com:5432/app?sslmode=require&connection_limit=8"
    );
    expect(opts.max).toBe(8);
    expect(opts.connectionString).toBe(
      "postgresql://user:pass@db.example.com:5432/app?sslmode=require"
    );
  });

  test("falls back gracefully on missing or malformed URLs", () => {
    expect(poolOptionsFromUrl(undefined).connectionString).toBeUndefined();
    expect(poolOptionsFromUrl("not a url").connectionString).toBe("not a url");
    expect(poolOptionsFromUrl("not a url").max).toBe(15);
  });
});
