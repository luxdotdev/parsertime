"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ScrimPositionalStats } from "@/data/scrim/positional-stats-service";
import {
  POSITIONAL_STAT_KEYS,
  POSITIONAL_STAT_FORMATTERS,
} from "@/lib/positional-stat-display";
import { useTranslations } from "next-intl";

export function PositionalStatsSection({
  data,
}: {
  data: ScrimPositionalStats;
}) {
  const t = useTranslations("scrimPage.positional");

  if (data.players.length === 0) {
    return null;
  }

  return (
    <section aria-label={t("title")} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("description")}</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0">
                {t("playerColumn")}
              </TableHead>
              {POSITIONAL_STAT_KEYS.map((stat) => (
                <TableHead key={stat} className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline decoration-dotted underline-offset-4">
                        {t(`stats.${stat}.short`)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{t(`stats.${stat}.full`)}</TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.players.map((player) => (
              <TableRow key={player.playerName}>
                <TableCell className="bg-background sticky left-0 font-medium">
                  {player.playerName}
                </TableCell>
                {POSITIONAL_STAT_KEYS.map((stat) => {
                  const value = player.stats[stat];
                  return (
                    <TableCell key={stat} className="text-right tabular-nums">
                      {value === undefined
                        ? "—"
                        : POSITIONAL_STAT_FORMATTERS[stat](value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
