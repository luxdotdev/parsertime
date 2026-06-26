import { getTzParts } from "./tz";

const FIRE_TOLERANCE_MS = 5 * 60 * 1000;

type ReminderConfig = {
  reminderDayOfWeek: number;
  reminderHour: number;
  reminderMinute: number;
  timezone: string;
};

export function isWithinReminderWindow(
  now: Date,
  cfg: ReminderConfig
): boolean {
  const parts = getTzParts(now, cfg.timezone);
  if (parts.weekday !== cfg.reminderDayOfWeek) return false;

  const localNowMinutes = parts.hour * 60 + parts.minute;
  const targetMinutes = cfg.reminderHour * 60 + cfg.reminderMinute;
  const deltaMinutes = Math.abs(localNowMinutes - targetMinutes);
  return deltaMinutes * 60 * 1000 <= FIRE_TOLERANCE_MS;
}

export function wasFiredThisWeek(
  lastReminderFiredAt: Date | null | undefined,
  weekStart: Date
): boolean {
  if (!lastReminderFiredAt) return false;
  return lastReminderFiredAt.getTime() >= weekStart.getTime();
}
