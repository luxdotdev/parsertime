import { cn } from "@/lib/utils";

/**
 * Shared, presentational data-viz primitives for the FACEIT scouting surfaces.
 * Pure (no hooks) so they can be composed inside any client component. Every
 * primitive encodes signal with the achromatic + amber-as-signal palette and
 * stays readable without color (numbers travel alongside the bar).
 */

type Tone = "primary" | "destructive" | "muted";

const FILL: Record<Tone, string> = {
  primary: "bg-primary/70",
  destructive: "bg-destructive/70",
  muted: "bg-muted-foreground/40",
};

/**
 * A horizontal magnitude bar (0..max). Optionally draws a vertical reference
 * tick (e.g. the 50% break-even line on a win-rate bar) so "above / below the
 * line" reads instantly.
 */
export function MeterBar({
  value,
  max = 100,
  tone = "primary",
  referenceAt,
  className,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  /** Fraction 0..1 at which to draw a break-even tick. */
  referenceAt?: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={cn(
        "bg-muted relative h-1.5 w-full overflow-hidden rounded-full",
        className
      )}
    >
      <div
        className={cn("h-full rounded-full", FILL[tone])}
        style={{ width: `${pct}%` }}
      />
      {referenceAt != null ? (
        <div
          className="bg-foreground/35 absolute inset-y-0 w-px"
          style={{ left: `${referenceAt * 100}%` }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

/**
 * A diverging bar centered on zero: fills right (positive) or left (negative)
 * from the midline. Used for signed deltas (ban impact) and z-scores
 * (strengths vs weaknesses).
 */
export function DivergingBar({
  value,
  magnitude,
  positiveTone = "primary",
  negativeTone = "destructive",
  className,
}: {
  value: number;
  /** Absolute value mapped to a full half-width. */
  magnitude: number;
  positiveTone?: Tone;
  negativeTone?: Tone;
  className?: string;
}) {
  const clamped = Math.max(-magnitude, Math.min(magnitude, value));
  const half = magnitude > 0 ? (Math.abs(clamped) / magnitude) * 50 : 0;
  const positive = value >= 0;
  return (
    <div
      className={cn(
        "bg-muted relative h-1.5 w-full overflow-hidden rounded-full",
        className
      )}
    >
      <div
        className="bg-border absolute inset-y-0 left-1/2 w-px"
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute inset-y-0 rounded-full",
          FILL[positive ? positiveTone : negativeTone]
        )}
        style={
          positive
            ? { left: "50%", width: `${half}%` }
            : { right: "50%", width: `${half}%` }
        }
      />
    </div>
  );
}

/**
 * A segmented proportional strip (parts of a whole), e.g. tier distribution.
 * Each segment carries a title for hover/screen-reader context.
 */
export function SegmentStrip({
  segments,
  className,
}: {
  segments: { key: string; value: number; title: string; tone?: Tone }[];
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return null;
  return (
    <div
      className={cn(
        "border-border flex h-2 w-full overflow-hidden rounded-full border",
        className
      )}
      role="img"
    >
      {segments.map((seg, i) => (
        <div
          key={seg.key}
          className={cn(
            FILL[seg.tone ?? "primary"],
            i > 0 && "border-background border-l"
          )}
          style={{ width: `${(seg.value / total) * 100}%` }}
          title={seg.title}
        />
      ))}
    </div>
  );
}
