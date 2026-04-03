import { parseCoordinate, splitLinePreservingCoords } from "@/lib/parser";
import { describe, expect, test } from "vitest";

describe("splitLinePreservingCoords", () => {
  test("splits a line with no coordinates identically to split(',')", () => {
    const line =
      "kill,32.06,Team 2,parrot,Zarya,Team 1,H1dd3n,Lúcio,Secondary Fire,22.52,0,0";
    expect(splitLinePreservingCoords(line)).toEqual(line.split(","));
  });

  test("preserves a single coordinate tuple", () => {
    const line =
      "ability_1_used,0.02,Team 1,H1dd3n,Lúcio,0,(59.73, 267.58, 340.44)";
    const result = splitLinePreservingCoords(line);
    expect(result).toEqual([
      "ability_1_used",
      "0.02",
      "Team 1",
      "H1dd3n",
      "Lúcio",
      "0",
      "(59.73, 267.58, 340.44)",
    ]);
  });

  test("preserves two coordinate tuples", () => {
    const line =
      "damage,1.22,Team 2,parrot,Zarya,Team 2,parrot,Zarya,Secondary Fire,27.50,0,0,(-51.67, 270.23, 333.79),(-51.67, 270.23, 333.79)";
    const result = splitLinePreservingCoords(line);
    expect(result).toEqual([
      "damage",
      "1.22",
      "Team 2",
      "parrot",
      "Zarya",
      "Team 2",
      "parrot",
      "Zarya",
      "Secondary Fire",
      "27.50",
      "0",
      "0",
      "(-51.67, 270.23, 333.79)",
      "(-51.67, 270.23, 333.79)",
    ]);
  });

  test("handles negative numbers in coordinates", () => {
    const line =
      "healing,8.26,Team 2,Boop,Moira,Team 2,Nox,Lúcio,Primary Fire,2.18,0,(-18.64, 267.00, 289.82),(-15.48, 269.41, 294.17)";
    const result = splitLinePreservingCoords(line);
    expect(result[11]).toBe("(-18.64, 267.00, 289.82)");
    expect(result[12]).toBe("(-15.48, 269.41, 294.17)");
  });

  test("handles empty line", () => {
    expect(splitLinePreservingCoords("")).toEqual([""]);
  });

  test("handles line with no commas", () => {
    expect(splitLinePreservingCoords("hello")).toEqual(["hello"]);
  });

  test("handles kill line with extra field and coordinates", () => {
    const line =
      "kill,32.06,Team 2,parrot,Zarya,Team 1,H1dd3n,Lúcio,Secondary Fire,22.52,0,0,0,(6.38, 270.00, 295.06),(8.44, 271.11, 301.84)";
    const result = splitLinePreservingCoords(line);
    expect(result.length).toBe(15);
    expect(result[12]).toBe("0");
    expect(result[13]).toBe("(6.38, 270.00, 295.06)");
    expect(result[14]).toBe("(8.44, 271.11, 301.84)");
  });
});

describe("parseCoordinate", () => {
  test("parses valid coordinate string", () => {
    const result = parseCoordinate("(59.73, 267.58, 340.44)");
    expect(result).toEqual({ x: 59.73, y: 267.58, z: 340.44 });
  });

  test("parses negative coordinates", () => {
    const result = parseCoordinate("(-18.64, 267.00, -289.82)");
    expect(result).toEqual({ x: -18.64, y: 267.0, z: -289.82 });
  });

  test("returns null for invalid string", () => {
    expect(parseCoordinate("2}")).toBeNull();
  });

  test("returns null for undefined", () => {
    expect(parseCoordinate(undefined)).toBeNull();
  });

  test("returns null for null", () => {
    expect(parseCoordinate(null)).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseCoordinate("")).toBeNull();
  });

  test("returns null for number", () => {
    expect(parseCoordinate(42)).toBeNull();
  });

  test("returns null for non-coordinate string", () => {
    expect(parseCoordinate("Secondary Fire")).toBeNull();
  });

  test("handles coordinates with no spaces after commas", () => {
    const result = parseCoordinate("(1.0,2.0,3.0)");
    expect(result).toEqual({ x: 1.0, y: 2.0, z: 3.0 });
  });

  test("handles coordinates with extra whitespace", () => {
    const result = parseCoordinate("  (1.5, 2.5, 3.5)  ");
    expect(result).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
  });
});
