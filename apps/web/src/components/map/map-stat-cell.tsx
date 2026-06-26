import type { ReactNode } from "react";

export function MapStatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {label}
      </span>
      <span className="font-mono text-base leading-tight font-semibold tabular-nums">
        {value}
      </span>
      {sub ? (
        <span className="text-muted-foreground text-xs">{sub}</span>
      ) : null}
    </div>
  );
}
