import { matchesAnyName } from "@/lib/tsr/team";
import { describe, expect, it } from "vitest";

function member(name: string | null, battletag: string | null) {
  return {
    id: "u1",
    name,
    battletag,
  };
}

describe("matchesAnyName", () => {
  it("matches on display name (case-insensitive)", () => {
    expect(matchesAnyName(member("Proper", null), new Set(["proper"]))).toBe(
      true
    );
    expect(matchesAnyName(member("Proper", null), new Set(["PROPER"]))).toBe(
      true
    );
  });

  it("matches on full battletag", () => {
    expect(
      matchesAnyName(member(null, "Proper#1234"), new Set(["Proper#1234"]))
    ).toBe(true);
  });

  it("matches on battletag prefix (in-game logs drop the discriminator)", () => {
    expect(
      matchesAnyName(member(null, "Proper#1234"), new Set(["Proper"]))
    ).toBe(true);
  });

  it("does not match an unrelated name", () => {
    expect(
      matchesAnyName(member("Proper", "Proper#1234"), new Set(["Someone"]))
    ).toBe(false);
  });

  it("returns false for an empty substitute set", () => {
    expect(matchesAnyName(member("Proper", "Proper#1234"), new Set())).toBe(
      false
    );
  });
});
