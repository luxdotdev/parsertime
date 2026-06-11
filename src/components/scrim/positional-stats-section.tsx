"use client";

import { PositionalOutcomeBars } from "@/components/scrim/positional-outcome-bars";
import { PositionalStatHeatmap } from "@/components/scrim/positional-stat-heatmap";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScrimPositionalArtifacts } from "@/data/scrim/positional-artifacts-service";
import type { ScrimPositionalStats } from "@/data/scrim/positional-stats-service";
import type { ZoneCountRow } from "@/lib/zones/analytics";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const EM_DASH = "—";

// The metadata layer: column headers recede so the numbers sit on top.
const HEAD_LABEL =
  "text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase";
// Comparable numbers render in Geist Mono with tabular figures so columns
// align on the digit (the Tabular-Numeral Rule).
const NUM_CELL = "text-right font-mono tabular-nums";
// Section eyebrows, matching the sibling raw-stats sub-sections.
const SECTION_EYEBROW =
  "text-muted-foreground text-xs font-medium tracking-wide uppercase";

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
    <section aria-label={t("title")} className="space-y-6">
      <p className="text-muted-foreground text-sm">{t("description")}</p>

      <PositionalStatHeatmap data={data} />

      {showEngagements && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <h3 className={SECTION_EYEBROW}>{t("engagementsTitle")}</h3>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <span className="text-foreground text-base font-semibold tabular-nums">
                  {t("fights", { total: engagements.total })}
                </span>
                <span className="font-mono text-sm tabular-nums">
                  {t("recordSummary", {
                    won: engagements.won,
                    lost: engagements.lost,
                    even: engagements.even,
                  })}
                </span>
                <span className="text-sm">
                  <span className="text-muted-foreground">
                    {t("winrate")}:{" "}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatWinrate(engagements.winratePercent)}
                  </span>
                </span>
              </div>
            </div>

            {engagements.byZone.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-muted-foreground font-mono text-xs tracking-[0.06em] uppercase">
                  {t("byZoneTitle")}
                </h4>
                <PositionalOutcomeBars
                  rows={engagements.byZone.map((z) => ({
                    label: z.zoneName,
                    won: z.won,
                    lost: z.lost,
                    neutral: z.even,
                  }))}
                  labels={{
                    won: t("wonLabel"),
                    neutral: t("evenLabel"),
                    lost: t("lostLabel"),
                  }}
                />
              </div>
            ) : (
              <PositionalOutcomeBars
                rows={[
                  {
                    label: "",
                    won: engagements.won,
                    lost: engagements.lost,
                    neutral: engagements.even,
                  },
                ]}
                labels={{
                  won: t("wonLabel"),
                  neutral: t("evenLabel"),
                  lost: t("lostLabel"),
                }}
                showLabels={false}
                showMeta={false}
              />
            )}
          </div>
        </>
      )}

      {zonesByMap.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className={SECTION_EYEBROW}>{t("zonesTitle")}</h3>
            {zonesByMap.map((entry) => (
              <div key={entry.mapName} className="space-y-2">
                <h4 className="text-muted-foreground font-mono text-xs tracking-[0.06em] uppercase">
                  {entry.mapName}
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={HEAD_LABEL}>
                        {t("zoneColumn")}
                      </TableHead>
                      <TableHead className={HEAD_LABEL}>
                        {t("teamColumn")}
                      </TableHead>
                      <TableHead className={cn(HEAD_LABEL, "text-right")}>
                        {t("killsColumn")}
                      </TableHead>
                      <TableHead className={cn(HEAD_LABEL, "text-right")}>
                        {t("deathsColumn")}
                      </TableHead>
                      <TableHead className={cn(HEAD_LABEL, "text-right")}>
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
                          <TableCell className={NUM_CELL}>
                            {row.kills}
                          </TableCell>
                          <TableCell className={NUM_CELL}>
                            {row.deaths}
                          </TableCell>
                          <TableCell className={NUM_CELL}>{row.ults}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </>
      )}

      {routesByMap.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className={SECTION_EYEBROW}>{t("routesTitle")}</h3>
            <PositionalOutcomeBars
              rows={routesByMap.map((entry) => ({
                label: entry.mapName,
                won: entry.won,
                lost: entry.lost,
                neutral: Math.max(0, entry.total - entry.won - entry.lost),
              }))}
              labels={{
                won: t("wonLabel"),
                neutral: t("routesUndecided"),
                lost: t("lostLabel"),
              }}
            />
          </div>
        </>
      )}
    </section>
  );
}
