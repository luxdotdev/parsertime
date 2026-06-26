import "server-only";

import type { ComputedRow } from "@/lib/query-builder/aggregate";
import { computeTrends } from "@/lib/query-builder/compute/trends";

type TrendRow = ComputedRow & {
  result: "win" | "loss";
  date: string;
};

type Streak = {
  result: "win" | "loss" | "none";
  count: number;
  startDate: string | null;
  endDate: string | null;
};

function isTrendRow(row: ComputedRow): row is TrendRow {
  return (
    (row.result === "win" || row.result === "loss") &&
    typeof row.date === "string"
  );
}

function currentStreak(rowsNewestFirst: TrendRow[]): Streak {
  const first = rowsNewestFirst[0];
  if (!first) {
    return { result: "none", count: 0, startDate: null, endDate: null };
  }

  let count = 1;
  for (let i = 1; i < rowsNewestFirst.length; i++) {
    if (rowsNewestFirst[i].result !== first.result) break;
    count++;
  }

  return {
    result: first.result,
    count,
    startDate: rowsNewestFirst[count - 1]?.date ?? first.date,
    endDate: first.date,
  };
}

function updateLongest(best: Streak, candidate: Streak): Streak {
  return candidate.count > best.count ? candidate : best;
}

function longestStreaks(rowsNewestFirst: TrendRow[]): {
  win: Streak;
  loss: Streak;
} {
  const rowsOldestFirst = [...rowsNewestFirst].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  let longestWin: Streak = {
    result: "win",
    count: 0,
    startDate: null,
    endDate: null,
  };
  let longestLoss: Streak = {
    result: "loss",
    count: 0,
    startDate: null,
    endDate: null,
  };

  let current: Streak | null = null;
  for (const row of rowsOldestFirst) {
    if (!current || current.result !== row.result) {
      if (current?.result === "win")
        longestWin = updateLongest(longestWin, current);
      if (current?.result === "loss")
        longestLoss = updateLongest(longestLoss, current);
      current = {
        result: row.result,
        count: 1,
        startDate: row.date,
        endDate: row.date,
      };
      continue;
    }

    current.count++;
    current.endDate = row.date;
  }

  if (current?.result === "win")
    longestWin = updateLongest(longestWin, current);
  if (current?.result === "loss")
    longestLoss = updateLongest(longestLoss, current);

  return { win: longestWin, loss: longestLoss };
}

/**
 * Emit one row for the current streak and one row each for the longest win and
 * loss streaks, using the same match-result post-processing as trend charts.
 */
export async function computeStreaks(
  teamId: number,
  scrimIds: number[]
): Promise<ComputedRow[]> {
  const rows = (await computeTrends(teamId, scrimIds)).filter(isTrendRow);
  const current = currentStreak(rows);
  const longest = longestStreaks(rows);

  return [
    {
      streak: "current streak",
      result: current.result,
      length: current.count,
      start_date: current.startDate,
      end_date: current.endDate,
    },
    {
      streak: "longest win streak",
      result: "win",
      length: longest.win.count,
      start_date: longest.win.startDate,
      end_date: longest.win.endDate,
    },
    {
      streak: "longest loss streak",
      result: "loss",
      length: longest.loss.count,
      start_date: longest.loss.startDate,
      end_date: longest.loss.endDate,
    },
  ];
}
