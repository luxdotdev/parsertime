import {
  computeAnchor,
  computeGhostOffset,
  ghostRoundWindow,
  ghostTimeAt,
  isGhostVisible,
  type GhostRoundInfo,
} from "@/lib/replay/ghost-alignment";
import { expect, test } from "vitest";

const rounds = [
  { type: "round_start" as const, t: 10, roundNumber: 1, objectiveIndex: 0 },
  { type: "round_start" as const, t: 300, roundNumber: 2, objectiveIndex: 1 },
];
const kills = [
  { type: "kill" as const, t: 42 },
  { type: "kill" as const, t: 350 },
];
const events = [...rounds, ...kills];

test("ROUND_START anchor is the round's start time", () => {
  expect(computeAnchor(events, 1, "ROUND_START")).toBe(10);
  expect(computeAnchor(events, 2, "ROUND_START")).toBe(300);
});

test("FIRST_CONTACT anchor is the first kill at/after round start", () => {
  expect(computeAnchor(events, 1, "FIRST_CONTACT")).toBe(42);
  expect(computeAnchor(events, 2, "FIRST_CONTACT")).toBe(350);
});

test("FIRST_CONTACT falls back to round start when the round has no kills", () => {
  const noKills = [...rounds, { type: "kill" as const, t: 5 }];
  expect(computeAnchor(noKills, 1, "FIRST_CONTACT")).toBe(10);
});

test("unknown round returns null", () => {
  expect(computeAnchor(events, 9, "ROUND_START")).toBeNull();
});

test("offset maps primary time onto the ghost timeline with nudge", () => {
  const offset = computeGhostOffset(10, 100, 2);
  expect(offset).toBe(92);
  expect(ghostTimeAt(15, offset)).toBe(107);
});

test("ghostRoundWindow spans round start to next round start (or maxTime)", () => {
  expect(ghostRoundWindow(events, 1, 1000)).toEqual([10, 300]);
  expect(ghostRoundWindow(events, 2, 1000)).toEqual([300, 1000]);
  expect(ghostRoundWindow(events, 9, 1000)).toBeNull();
});

test("ghost is visible only while ghost time is inside its round window", () => {
  const info: GhostRoundInfo = {
    window: [100, 200],
    objectiveIndex: 0,
  };
  expect(isGhostVisible(150, info, null)).toBe(true);
  expect(isGhostVisible(99, info, null)).toBe(false);
  expect(isGhostVisible(201, info, null)).toBe(false);
});

test("on Control maps the ghost hides when objective indexes differ", () => {
  const info: GhostRoundInfo = { window: [100, 200], objectiveIndex: 1 };
  expect(isGhostVisible(150, info, 1)).toBe(true);
  expect(isGhostVisible(150, info, 0)).toBe(false);
});
