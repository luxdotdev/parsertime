export type TzParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const DAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getTzParts(date: Date, timeZone: string): TzParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const byType: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") byType[p.type] = p.value;
  }
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: byType.hour === "24" ? 0 : Number(byType.hour),
    minute: Number(byType.minute),
    weekday: DAY_MAP[byType.weekday ?? "Sun"] ?? 0,
  };
}

function wallClockUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  return Date.UTC(year, month - 1, day, hour, minute, 0, 0);
}

export function zonedDateToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  // Iterative solve — tz offsets change across DST, converge in ≤2 passes.
  let utcGuess = wallClockUtcMs(year, month, day, hour, minute);
  for (let i = 0; i < 3; i++) {
    const guessParts = getTzParts(new Date(utcGuess), timeZone);
    const guessWall = wallClockUtcMs(
      guessParts.year,
      guessParts.month,
      guessParts.day,
      guessParts.hour,
      guessParts.minute
    );
    const target = wallClockUtcMs(year, month, day, hour, minute);
    const delta = target - guessWall;
    if (delta === 0) break;
    utcGuess += delta;
  }
  return new Date(utcGuess);
}

export function weekStartInTz(now: Date, timeZone: string): Date {
  const parts = getTzParts(now, timeZone);
  return zonedDateToUtc(
    parts.year,
    parts.month,
    parts.day - parts.weekday,
    0,
    0,
    timeZone
  );
}

export function weekEndInTz(weekStart: Date, timeZone: string): Date {
  const parts = getTzParts(weekStart, timeZone);
  return zonedDateToUtc(parts.year, parts.month, parts.day + 7, 0, 0, timeZone);
}

export function listCommonTimezones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];
  if (supported.length > 0) return supported;
  return [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];
}
