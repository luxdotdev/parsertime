import { sanitizeDatabaseUrl } from "@/lib/db-url";
import { describe, expect, test } from "vitest";

describe("sanitizeDatabaseUrl", () => {
  test("strips sslrootcert=system (libpq idiom) but keeps file paths", () => {
    const system = sanitizeDatabaseUrl(
      "postgresql://u:p@h:5432/db?sslmode=verify-full&sslrootcert=system"
    );
    const parsedSystem = new URL(system!);
    expect(parsedSystem.searchParams.get("sslrootcert")).toBeNull();
    expect(parsedSystem.searchParams.get("sslmode")).toBe("verify-full");

    const file = sanitizeDatabaseUrl(
      "postgresql://u:p@h:5432/db?sslrootcert=/etc/ssl/ca.pem"
    );
    expect(new URL(file!).searchParams.get("sslrootcert")).toBe(
      "/etc/ssl/ca.pem"
    );
  });

  test("leaves URLs without the sentinel untouched", () => {
    expect(
      sanitizeDatabaseUrl("postgresql://u:p@h:5432/db?sslmode=require")
    ).toBe("postgresql://u:p@h:5432/db?sslmode=require");
  });

  test("passes through missing or malformed values", () => {
    expect(sanitizeDatabaseUrl(undefined)).toBeUndefined();
    expect(sanitizeDatabaseUrl("not a url")).toBe("not a url");
  });
});
