import { TIER_FLOOR_MARKERS } from "@/lib/tsr/breakdown";
import { cn } from "@/lib/utils";
import type { FaceitTier } from "@prisma/client";

type Props = {
  rating: number;
  maxTierReached: FaceitTier;
};

// The hard 1-5000 floor/ceiling crushes every tier marker into the right
// half of the bar (Open starts at 2500 = 50%). Clamp the visualization to
// the band where competitive ratings actually live so the markers spread.
// 4300 is effectively the empirical ceiling — clearing it would require an
// OWCS player who beats the soft cap and never loses, which doesn't happen
// in practice. The OWCS segment runs 3850-4300 and gets 13% of the bar,
// which is plenty for the variance among active OWCS players.
const LADDER_MIN = 1500;
const LADDER_MAX = 4300;

export function TierLadder({ rating, maxTierReached }: Props) {
  const range = LADDER_MAX - LADDER_MIN;
  const playerPct =
    (Math.max(LADDER_MIN, Math.min(LADDER_MAX, rating)) - LADDER_MIN) / range *
    100;

  // Build segments between floor markers. Floors define the lower edge of
  // their tier; the first segment runs from the ladder min up to OPEN.
  const segments: { tier: FaceitTier | null; from: number; to: number }[] = [];
  segments.push({
    tier: null,
    from: LADDER_MIN,
    to: TIER_FLOOR_MARKERS[0].floor,
  });
  for (let i = 0; i < TIER_FLOOR_MARKERS.length; i++) {
    const start = TIER_FLOOR_MARKERS[i];
    const end = TIER_FLOOR_MARKERS[i + 1];
    segments.push({
      tier: start.tier,
      from: start.floor,
      to: end?.floor ?? LADDER_MAX,
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex items-baseline justify-between font-mono text-[11px] tracking-[0.14em] uppercase">
        <span>Tier ladder</span>
        <span className="text-muted-foreground/70">
          {LADDER_MIN.toLocaleString()} – {LADDER_MAX.toLocaleString()}
        </span>
      </div>

      <div className="relative h-2 w-full">
        <div className="bg-muted absolute inset-0 flex overflow-hidden rounded-full">
          {segments.map((s) => {
            const widthPct = ((s.to - s.from) / range) * 100;
            const isMaxTier = s.tier === maxTierReached;
            return (
              <div
                key={`${s.tier ?? "floor"}-${s.from}`}
                style={{ width: `${widthPct}%` }}
                className={cn(
                  "h-full",
                  isMaxTier
                    ? "bg-primary/30"
                    : s.tier === null
                      ? "bg-muted"
                      : "bg-muted-foreground/10"
                )}
              />
            );
          })}
        </div>
        <div
          className="bg-primary absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--background)]"
          style={{ left: `${playerPct}%` }}
          aria-label={`Rating ${rating}`}
        />
      </div>

      {/* Stagger labels into two rows: even-indexed markers (Open, Expert,
          OWCS) sit on the top row, odd-indexed (Advanced, Masters) drop
          to the second row. With ~8% horizontal gaps between adjacent
          markers, "ADVANCED" and "MASTERS" need their own rows or the
          text collides. */}
      <div className="relative h-12">
        {TIER_FLOOR_MARKERS.map((m, i) => {
          const left = ((m.floor - LADDER_MIN) / range) * 100;
          const active = m.tier === maxTierReached;
          const row = i % 2 === 0 ? "top-0" : "top-6";
          return (
            <div
              key={m.tier}
              className={cn("absolute -translate-x-1/2 text-center", row)}
              style={{ left: `${left}%` }}
            >
              <div
                className={cn(
                  "bg-border mx-auto h-1.5 w-px",
                  active && "bg-primary"
                )}
                aria-hidden
              />
              <div
                className={cn(
                  "mt-1 font-mono text-[10px] leading-none tracking-[0.08em] whitespace-nowrap uppercase",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {m.label}
              </div>
              <div
                className={cn(
                  "mt-0.5 font-mono text-[10px] leading-none tabular-nums",
                  active ? "text-primary" : "text-muted-foreground/60"
                )}
              >
                {m.floor}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
