import { getTzParts, zonedDateToUtc } from "./tz";

export type AvailabilitySettingsShape = {
  slotMinutes: number;
  hoursStart: number;
  hoursEnd: number;
};

export const DAYS_PER_WEEK = 7;

export function visibleSlotsPerDay(s: AvailabilitySettingsShape): number {
  return ((s.hoursEnd - s.hoursStart) * 60) / s.slotMinutes;
}

export function totalVisibleSlots(s: AvailabilitySettingsShape): number {
  return visibleSlotsPerDay(s) * DAYS_PER_WEEK;
}

export function slotIndexToTime(
  index: number,
  s: AvailabilitySettingsShape
): { day: number; hour: number; minute: number } {
  const per = visibleSlotsPerDay(s);
  const day = Math.floor(index / per);
  const minuteOfDay = s.hoursStart * 60 + (index % per) * s.slotMinutes;
  return {
    day,
    hour: Math.floor(minuteOfDay / 60),
    minute: minuteOfDay % 60,
  };
}

export function isValidSlotIndex(
  index: number,
  s: AvailabilitySettingsShape
): boolean {
  return Number.isInteger(index) && index >= 0 && index < totalVisibleSlots(s);
}

export function sanitizeSlots(
  raw: unknown,
  s: AvailabilitySettingsShape
): number[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<number>();
  for (const v of raw) {
    const n = typeof v === "number" ? v : Number(v);
    if (isValidSlotIndex(n, s)) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function slotIndexToUtc(
  index: number,
  weekStart: Date,
  s: AvailabilitySettingsShape,
  timezone: string
): Date {
  const { day, hour, minute } = slotIndexToTime(index, s);
  const baseParts = getTzParts(weekStart, timezone);
  return zonedDateToUtc(
    baseParts.year,
    baseParts.month,
    baseParts.day + day,
    hour,
    minute,
    timezone
  );
}
