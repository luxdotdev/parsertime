import { mapTypeToModeFamily } from "@/lib/win-probability/types";
import { describe, expect, test } from "vitest";

describe("mapTypeToModeFamily", () => {
  test("maps each supported MapType to its family", () => {
    expect(mapTypeToModeFamily("Control")).toBe("control");
    expect(mapTypeToModeFamily("Escort")).toBe("escort_hybrid");
    expect(mapTypeToModeFamily("Hybrid")).toBe("escort_hybrid");
    expect(mapTypeToModeFamily("Push")).toBe("push");
    expect(mapTypeToModeFamily("Flashpoint")).toBe("flashpoint");
  });

  test("returns null for Clash (retired) and unknown types", () => {
    expect(mapTypeToModeFamily("Clash")).toBeNull();
    expect(mapTypeToModeFamily("SomethingNew")).toBeNull();
  });
});
