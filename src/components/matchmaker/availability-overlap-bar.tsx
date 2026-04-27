type Props = { hours: number };

const HOURS_PER_WEEK = 168;

export function AvailabilityOverlapBar({ hours }: Props) {
  if (hours === 0) {
    return (
      <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
        No shared availability
      </span>
    );
  }
  const pct = Math.min(100, Math.round((hours / HOURS_PER_WEEK) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1 w-20 overflow-hidden rounded-full">
        <div
          className="bg-emerald-500/70 h-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-muted-foreground font-mono text-[10px] tabular-nums tracking-[0.08em] uppercase">
        {hours}h overlap
      </span>
    </div>
  );
}
