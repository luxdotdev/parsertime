// Named TimeWindow (not Window) to avoid shadowing the DOM global.
export type TimeWindow = [number, number];

/** Sorted, merged [t-pad, t+pad] intervals around each event time. */
export function buildWindows(times: number[], padSec: number): TimeWindow[] {
  if (times.length === 0) return [];
  const sorted = [...times].sort((a, b) => a - b);
  const windows: TimeWindow[] = [];
  let [start, end] = [sorted[0] - padSec, sorted[0] + padSec];
  for (let i = 1; i < sorted.length; i++) {
    const s = sorted[i] - padSec;
    const e = sorted[i] + padSec;
    if (s <= end) {
      end = Math.max(end, e);
    } else {
      windows.push([start, end]);
      [start, end] = [s, e];
    }
  }
  windows.push([start, end]);
  return windows;
}

export function inWindows(t: number, windows: TimeWindow[]): boolean {
  for (const [s, e] of windows) {
    if (t < s) return false;
    if (t <= e) return true;
  }
  return false;
}
