"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MapWinrateEntry } from "@/data/faceit/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  byMap: MapWinrateEntry[];
  byType: MapWinrateEntry[];
};

function WinrateTable({
  rows,
  keyHeader,
  lowSampleLabel,
}: {
  rows: MapWinrateEntry[];
  keyHeader: string;
  lowSampleLabel: string;
}) {
  const t = useTranslations("faceitPlayerPage");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{keyHeader}</TableHead>
          <TableHead className="text-right">{t("maps.played")}</TableHead>
          <TableHead className="text-right">{t("maps.won")}</TableHead>
          <TableHead className="text-right">{t("maps.winRate")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.key}
            className={cn(!row.rated && "text-muted-foreground")}
          >
            <TableCell className="text-sm">
              <span className="mr-2">{row.key}</span>
              {!row.rated ? (
                <Badge variant="outline" className="text-xs">
                  {lowSampleLabel}
                </Badge>
              ) : null}
            </TableCell>
            <TableCell className="text-right tabular-nums text-sm">
              {row.played}
            </TableCell>
            <TableCell className="text-right tabular-nums text-sm">
              {row.won}
            </TableCell>
            <TableCell className="text-right tabular-nums text-sm">
              {(row.winRate * 100).toFixed(0)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function PlayerMapWinrates({ byMap, byType }: Props) {
  const t = useTranslations("faceitPlayerPage");

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t("maps.eyebrow")} title={t("maps.title")} />
      <div className="space-y-2">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("maps.byMap")}
        </p>
        <WinrateTable
          rows={byMap}
          keyHeader={t("maps.map")}
          lowSampleLabel={t("maps.lowSample")}
        />
      </div>
      <div className="space-y-2">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
          {t("maps.byType")}
        </p>
        <WinrateTable
          rows={byType}
          keyHeader={t("maps.mode")}
          lowSampleLabel={t("maps.lowSample")}
        />
      </div>
    </div>
  );
}
