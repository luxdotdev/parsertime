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
import type { ScrimPositionalArtifacts } from "@/data/scrim/positional-artifacts-service";
import type { ScrimPositionalStats } from "@/data/scrim/positional-stats-service";
import {
  POSITIONAL_STAT_KEYS,
  POSITIONAL_STAT_FORMATTERS,
} from "@/lib/positional-stat-display";
import type { ZoneCountRow } from "@/lib/zones/analytics";
import { useTranslations } from "next-intl";

const EM_DASH = "—";

type ZoneGroup = { zoneName: string; rows: ZoneCountRow[] };

function groupZoneRows(rows: ZoneCountRow[]): ZoneGroup[] {
  const groups = new Map<string, ZoneCountRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.zoneName);
    if (existing) existing.push(row);
    else groups.set(row.zoneName, [row]);
  }
  return [...groups.entries()].map(([zoneName, zoneRows]) => ({
    zoneName,
    rows: zoneRows,
  }));
}

function formatWinrate(winratePercent: number | null): string {
  return winratePercent === null ? EM_DASH : `${winratePercent.toFixed(1)}%`;
}

export function PositionalStatsSection({
  data,
  artifacts = null,
}: {
  data: ScrimPositionalStats;
  artifacts?: ScrimPositionalArtifacts | null;
}) {
  const t = useTranslations("scrimPage.positional");

  if (data.players.length === 0) {
    return null;
  }

  const engagements = artifacts?.engagements ?? null;
  const showEngagements = engagements !== null && engagements.total > 0;
  const zonesByMap = artifacts?.zonesByMap ?? [];
  const routesByMap = artifacts?.routesByMap ?? [];

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
                        ? EM_DASH
                        : POSITIONAL_STAT_FORMATTERS[stat](value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showEngagements && (
        <div className="space-y-3 pt-2">
          <h3 className="text-base font-semibold tracking-tight">
            {t("engagementsTitle")}
          </h3>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
            <span>{t("fights", { total: engagements.total })}</span>
            <span className="tabular-nums">
              {t("recordSummary", {
                won: engagements.won,
                lost: engagements.lost,
                even: engagements.even,
              })}
            </span>
            <span className="tabular-nums">
              {t("winrate")}: {formatWinrate(engagements.winratePercent)}
            </span>
          </div>
          {engagements.byZone.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("zoneColumn")}</TableHead>
                    <TableHead className="text-right">
                      {t("wonLabel")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("lostLabel")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("evenLabel")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engagements.byZone.map((zone) => (
                    <TableRow key={zone.zoneName}>
                      <TableCell className="font-medium">
                        {zone.zoneName}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {zone.won}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {zone.lost}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {zone.even}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {zonesByMap.length > 0 && (
        <div className="space-y-4 pt-2">
          <h3 className="text-base font-semibold tracking-tight">
            {t("zonesTitle")}
          </h3>
          {zonesByMap.map((entry) => (
            <div key={entry.mapName} className="space-y-2">
              <h4 className="text-muted-foreground font-mono text-xs tracking-[0.06em] uppercase">
                {entry.mapName}
              </h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("zoneColumn")}</TableHead>
                      <TableHead>{t("teamColumn")}</TableHead>
                      <TableHead className="text-right">
                        {t("killsColumn")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("deathsColumn")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("ultsColumn")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupZoneRows(entry.rows).map((group) =>
                      group.rows.map((row, index) => (
                        <TableRow key={`${row.zoneName}-${row.team}`}>
                          <TableCell className="font-medium">
                            {index === 0 ? group.zoneName : ""}
                          </TableCell>
                          <TableCell>{row.team}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.kills}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.deaths}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.ults}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      {routesByMap.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-base font-semibold tracking-tight">
            {t("routesTitle")}
          </h3>
          <ul className="space-y-1 text-sm">
            {routesByMap.map((entry) => (
              <li key={entry.mapName} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{entry.mapName}</span>
                <span className="text-muted-foreground tabular-nums">
                  {t("routesSummary", {
                    total: entry.total,
                    won: entry.won,
                    lost: entry.lost,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
