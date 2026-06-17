"use client";

const EM_DASH = "—";

const WON_COLOR = "var(--primary)";
const NEUTRAL_COLOR =
  "color-mix(in oklch, var(--muted-foreground) 55%, transparent)";
const LOST_COLOR = "var(--destructive)";

export type OutcomeRow = {
  label: string;
  won: number;
  lost: number;
  neutral: number;
};

type EnrichedRow = OutcomeRow & { total: number };

function winrate(won: number, lost: number): string {
  return won + lost > 0
    ? `${((won / (won + lost)) * 100).toFixed(1)}%`
    : EM_DASH;
}

function Segment({ grow, color }: { grow: number; color: string }) {
  if (grow <= 0) return null;
  return (
    <span
      className="h-full first:rounded-l-[3px] last:rounded-r-[3px]"
      style={{ flexGrow: grow, minWidth: "0.375rem", backgroundColor: color }}
    />
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-[2px]"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function PositionalOutcomeBars({
  rows,
  labels,
  showLabels = true,
  showMeta = true,
  showLegend = true,
}: {
  rows: OutcomeRow[];
  /** Segment names: [won, neutral, lost]. */
  labels: { won: string; neutral: string; lost: string };
  showLabels?: boolean;
  showMeta?: boolean;
  showLegend?: boolean;
}) {
  const enriched: EnrichedRow[] = rows
    .map((r) => ({ ...r, total: r.won + r.lost + r.neutral }))
    .sort((a, b) => b.total - a.total);

  if (enriched.length === 0) return null;

  const maxTotal = Math.max(...enriched.map((r) => r.total), 1);
  const cols = showLabels
    ? "grid-cols-[minmax(6rem,8rem)_1fr_auto]"
    : "grid-cols-[1fr_auto]";

  return (
    <div className="space-y-2.5">
      {showLegend && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.06em] uppercase">
          <LegendChip color={WON_COLOR} label={labels.won} />
          <LegendChip color={NEUTRAL_COLOR} label={labels.neutral} />
          <LegendChip color={LOST_COLOR} label={labels.lost} />
        </div>
      )}

      <ul className="space-y-1.5">
        {enriched.map((row) => (
          <li
            key={row.label || "overall"}
            className={`grid items-center gap-x-3 ${cols}`}
            aria-label={`${row.label ? `${row.label}: ` : ""}${row.won} ${labels.won}, ${row.neutral} ${labels.neutral}, ${row.lost} ${labels.lost}`}
          >
            {showLabels && (
              <span className="truncate text-sm font-medium">{row.label}</span>
            )}
            <span className="bg-muted h-5 w-full overflow-hidden rounded-[4px]">
              <span
                className="flex h-full overflow-hidden rounded-[4px]"
                style={{ width: `${(row.total / maxTotal) * 100}%` }}
              >
                <Segment grow={row.won} color={WON_COLOR} />
                <Segment grow={row.neutral} color={NEUTRAL_COLOR} />
                <Segment grow={row.lost} color={LOST_COLOR} />
              </span>
            </span>
            {showMeta && (
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                <span className="text-foreground">{row.total}</span>
                {" · "}
                {winrate(row.won, row.lost)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
