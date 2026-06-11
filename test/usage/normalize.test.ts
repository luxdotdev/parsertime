import { describe, expect, it } from "vitest";
import { normalizePath } from "@/lib/usage/normalize";

describe("normalizePath", () => {
  it("strips the query string", () => {
    expect(normalizePath("/dashboard?tab=stats&token=abc")).toBe("/dashboard");
  });
  it("replaces numeric ids with [id]", () => {
    expect(normalizePath("/team/42/scrim/1001")).toBe("/team/[id]/scrim/[id]");
  });
  it("replaces uuid and cuid segments with [id]", () => {
    expect(
      normalizePath("/team/clx1a2b3c0000d4e5f6g7h8i9/map/9f8e7d6c-1234-4abc-9def-000000000000")
    ).toBe("/team/[id]/map/[id]");
  });
  it("does not collapse ordinary path words that start with 'c'", () => {
    expect(normalizePath("/tournaments/challenges")).toBe("/tournaments/challenges");
    expect(normalizePath("/admin/map-calibration")).toBe("/admin/map-calibration");
  });
  it("leaves a clean static route untouched", () => {
    expect(normalizePath("/settings/admin/analytics")).toBe(
      "/settings/admin/analytics"
    );
  });
  it("normalizes a trailing slash and empty path to '/'", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("/dashboard/")).toBe("/dashboard");
  });
});
