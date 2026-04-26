export type PatchType = "season" | "mid-season" | "hotfix";

export type OverwatchPatch = {
  date: string;
  type: PatchType;
  name: string;
};

export const OVERWATCH_PATCHES: OverwatchPatch[] = [
  { date: "2024-02-13", type: "season", name: "Season 9: Champions" },
  { date: "2024-04-16", type: "season", name: "Season 10: Venture" },
  { date: "2024-04-30", type: "mid-season", name: "Season 10 Mid-Cycle" },
  { date: "2024-05-30", type: "mid-season", name: "Season 10 Balance" },
  {
    date: "2024-06-20",
    type: "season",
    name: "Season 11: Super Mega Ultrawatch",
  },
  { date: "2024-08-20", type: "season", name: "Season 12: Spellbinder" },
  { date: "2024-10-15", type: "season", name: "Season 13: Spaced Out" },
  { date: "2024-11-12", type: "mid-season", name: "Season 13 Mid-Cycle" },
  { date: "2024-12-10", type: "season", name: "Season 14: Hazard Pay" },
  { date: "2025-02-18", type: "season", name: "Season 15: Honor and Glory" },
  { date: "2025-02-25", type: "hotfix", name: "Season 15 Hotfix" },
  { date: "2025-04-01", type: "hotfix", name: "April Fools Patch" },
  { date: "2025-04-22", type: "season", name: "Season 16: Stadium" },
  { date: "2025-05-20", type: "mid-season", name: "Season 16 Mid-Cycle" },
  { date: "2025-06-24", type: "season", name: "Season 17: Powered Up" },
  { date: "2025-07-22", type: "mid-season", name: "Season 17 Mid-Cycle" },
  { date: "2025-08-26", type: "season", name: "Season 18" },
  { date: "2025-09-16", type: "mid-season", name: "Season 18 Mid-Cycle" },
  { date: "2025-10-14", type: "season", name: "Season 19" },
  { date: "2026-02-10", type: "season", name: "Season 1: Conquest" },
  { date: "2026-02-13", type: "hotfix", name: "Season 1 Hotfix" },
  { date: "2026-02-18", type: "hotfix", name: "Season 1 Hotfix" },
  { date: "2026-02-24", type: "hotfix", name: "Season 1 Hotfix" },
  { date: "2026-02-25", type: "hotfix", name: "Season 1 Hotfix" },
  { date: "2026-03-10", type: "mid-season", name: "Season 1 Mid-Cycle" },
  { date: "2026-03-31", type: "hotfix", name: "Season 1 Late Hotfix" },
  { date: "2026-04-01", type: "hotfix", name: "Underwatch Event" },
  { date: "2026-04-14", type: "season", name: "Season 2: Summit" },
  { date: "2026-04-17", type: "hotfix", name: "Season 2 Hotfix" },
  { date: "2026-04-23", type: "hotfix", name: "Season 2 Balance" },
];

export function getPatchesInRange(
  startDate: string,
  endDate: string
): OverwatchPatch[] {
  return OVERWATCH_PATCHES.filter(
    (patch) => patch.date >= startDate && patch.date <= endDate
  );
}
