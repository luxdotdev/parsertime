export type PatchType = "season" | "mid-season" | "hotfix";

export type OverwatchPatch = {
  date: string;
  type: PatchType;
  name: string;
};

export function getPatchesInRange(
  patches: OverwatchPatch[],
  startDate: string,
  endDate: string
): OverwatchPatch[] {
  return patches.filter(
    (patch) => patch.date >= startDate && patch.date <= endDate
  );
}
