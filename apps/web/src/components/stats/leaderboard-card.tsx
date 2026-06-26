import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Column = {
  label: string;
  align?: "left" | "right";
};

export type LeaderboardRow = {
  key: string;
  name: ReactNode;
  value: ReactNode;
};

export function LeaderboardCard({
  title,
  rankLabel,
  columns,
  rows,
  footer,
}: {
  title: string;
  rankLabel: string;
  columns: [Column, Column];
  rows: LeaderboardRow[];
  footer?: ReactNode;
}) {
  return (
    <div className="bg-card flex flex-col px-5 py-4">
      <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {title}
      </h3>
      <div className="mt-3">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground/70 h-7 w-9 px-0 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                {rankLabel}
              </TableHead>
              <TableHead className="text-muted-foreground/70 h-7 px-2 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                {columns[0].label}
              </TableHead>
              <TableHead
                className={cn(
                  "text-muted-foreground/70 h-7 px-2 font-mono text-[0.625rem] tracking-[0.06em] uppercase",
                  columns[1].align === "right" ? "text-right" : ""
                )}
              >
                {columns[1].label}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={row.key} className="hover:bg-transparent">
                <TableCell className="px-0 py-1.5">
                  <RankCell rank={idx + 1} />
                </TableCell>
                <TableCell className="truncate px-2 py-1.5 text-sm">
                  {row.name}
                </TableCell>
                <TableCell
                  className={cn(
                    "px-2 py-1.5 font-mono text-sm tabular-nums",
                    columns[1].align === "right" ? "text-right" : ""
                  )}
                >
                  {row.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {footer ? (
        <p className="text-muted-foreground mt-3 text-xs">{footer}</p>
      ) : null}
    </div>
  );
}

function RankCell({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "inline-flex w-6 justify-end font-mono text-xs tabular-nums",
        rank === 1 ? "text-primary font-semibold" : "text-muted-foreground/80"
      )}
    >
      {rank.toString().padStart(2, "0")}
    </span>
  );
}
