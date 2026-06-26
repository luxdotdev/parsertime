export type MonthEndProjection = {
  fraction: number; // dayOfMonth / daysInMonth, 0..1
  projectedTotal: number; // round(actual / fraction)
  projectedDelta: number; // projectedTotal - actual (the shaded extension)
};

/**
 * Linear run-rate projection of where the current month finishes: if `actual`
 * accrued over the elapsed fraction of the month, scale it up to the full month.
 * Returns a zero delta on the final day of the month or when nothing has accrued.
 */
export function projectMonthEnd(actual: number, now: Date): MonthEndProjection {
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const dayOfMonth = now.getDate();
  const fraction = dayOfMonth / daysInMonth;

  if (actual <= 0 || dayOfMonth >= daysInMonth) {
    return { fraction, projectedTotal: actual, projectedDelta: 0 };
  }

  const projectedTotal = Math.round(actual / fraction);
  const projectedDelta = Math.max(0, projectedTotal - actual);
  return { fraction, projectedTotal, projectedDelta };
}
