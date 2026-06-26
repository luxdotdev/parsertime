import { cn } from "@/lib/utils";

export type RibbonCell = {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
  /** Override the default `text-2xl` value sizing (e.g. long string values). */
  valueClassName?: string;
};

type StatRibbonProps = {
  cells: RibbonCell[];
  columns?: 3 | 4 | 5 | 6;
};

const columnsClass: Record<NonNullable<StatRibbonProps["columns"]>, string> = {
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-5",
  6: "sm:grid-cols-3 lg:grid-cols-6",
};

export function StatRibbon({ cells, columns = 4 }: StatRibbonProps) {
  return (
    <dl
      className={cn(
        "border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y lg:divide-y-0",
        columnsClass[columns]
      )}
    >
      {cells.map((cell) => (
        <div key={cell.label} className="flex flex-col gap-1 px-4 py-3">
          <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
            {cell.label}
          </dt>
          <dd
            className={cn(
              "font-mono text-2xl leading-none font-semibold tabular-nums",
              cell.emphasis ? "text-primary" : "text-foreground",
              cell.valueClassName
            )}
          >
            {cell.value}
          </dd>
          {cell.sub ? (
            <dd className="text-muted-foreground text-xs">{cell.sub}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
