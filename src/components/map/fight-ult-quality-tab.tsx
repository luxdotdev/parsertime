import { AppRuntime } from "@/data/runtime";
import { FightUltQualityService } from "@/data/map/fight-ult-quality-service";
import { ZoneAnalyticsService } from "@/data/map/zone-analytics-service";
import type { ZoneCountRow } from "@/lib/zones/analytics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toTimestamp } from "@/lib/utils";
import { Skull } from "lucide-react";
import { Effect } from "effect";
import { getTranslations } from "next-intl/server";

const EM_DASH = "—";

export async function FightUltQualityTab({ id }: { id: number }) {
  const [data, zoneAnalytics, t] = await Promise.all([
    AppRuntime.runPromise(
      FightUltQualityService.pipe(
        Effect.flatMap((svc) => svc.getFightUltQuality(id))
      )
    ),
    AppRuntime.runPromise(
      ZoneAnalyticsService.pipe(
        Effect.flatMap((svc) => svc.getZoneAnalytics(id))
      )
    ),
    getTranslations("mapPage.fightUltQuality"),
  ]);

  if (data === null) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t("noData")}</p>
      </div>
    );
  }

  const ults = [...data.ults].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("ults.heading")}
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("ults.time")}</TableHead>
              <TableHead>{t("ults.player")}</TableHead>
              <TableHead>{t("ults.hero")}</TableHead>
              <TableHead>{t("ults.zone")}</TableHead>
              <TableHead>{t("ults.displacement")}</TableHead>
              <TableHead>{t("ults.conversionKills")}</TableHead>
              <TableHead>{t("ults.diedDuringUlt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ults.map((ult) => (
              <TableRow key={`${ult.playerName}-${ult.hero}-${ult.startTime}`}>
                <TableCell>
                  {toTimestamp(ult.startTime)}
                  {ult.unpaired && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground ml-1 cursor-help">
                          *
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{t("ults.unpaired")}</TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{ult.playerName}</TableCell>
                <TableCell>{ult.hero}</TableCell>
                <TableCell>{ult.zone?.name ?? EM_DASH}</TableCell>
                <TableCell>
                  {ult.displacement === null
                    ? EM_DASH
                    : t("ults.meters", { value: ult.displacement })}
                </TableCell>
                <TableCell>{ult.conversionKills ?? EM_DASH}</TableCell>
                <TableCell>
                  {ult.diedDuringUlt ? (
                    <Badge variant="destructive">
                      <Skull className="size-3" aria-hidden />
                      {t("ults.died")}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{EM_DASH}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("engagements.heading")}
        </h2>
        <ul className="divide-border divide-y rounded-lg border">
          {data.engagements.map((engagement) => {
            const teams = Object.keys(engagement.killsByTeam);
            const teamA = teams[0];
            const teamB = teams[1];
            const killsA = teamA ? (engagement.killsByTeam[teamA] ?? 0) : 0;
            const killsB = teamB ? (engagement.killsByTeam[teamB] ?? 0) : 0;
            return (
              <li
                key={`${engagement.start}-${engagement.end}-${engagement.centroid.x}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {`${toTimestamp(engagement.start)} – ${toTimestamp(
                      engagement.end
                    )}`}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {engagement.zoneName ?? EM_DASH}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{`${killsA}–${killsB}`}</span>
                  {engagement.winner ? (
                    <Badge variant="secondary">{engagement.winner}</Badge>
                  ) : (
                    <Badge variant="outline">{t("engagements.even")}</Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("zones.title")}
        </h2>
        {zoneAnalytics === null ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">{t("zones.empty")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("zones.zone")}</TableHead>
                <TableHead>{t("zones.team")}</TableHead>
                <TableHead>{t("zones.kills")}</TableHead>
                <TableHead>{t("zones.deaths")}</TableHead>
                <TableHead>{t("zones.ults")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupZoneRows(zoneAnalytics.rows).map((group) =>
                group.rows.map((row, index) => (
                  <TableRow key={`${row.zoneName}-${row.team}`}>
                    <TableCell>{index === 0 ? group.zoneName : ""}</TableCell>
                    <TableCell>{row.team}</TableCell>
                    <TableCell>{row.kills}</TableCell>
                    <TableCell>{row.deaths}</TableCell>
                    <TableCell>{row.ults}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

type ZoneGroup = { zoneName: string; rows: ZoneCountRow[] };

function groupZoneRows(rows: ZoneCountRow[]): ZoneGroup[] {
  const groups = new Map<string, ZoneCountRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.zoneName);
    if (existing) existing.push(row);
    else groups.set(row.zoneName, [row]);
  }
  return [...groups.entries()]
    .map(([zoneName, zoneRows]) => ({
      zoneName,
      rows: zoneRows.sort((a, b) => a.team.localeCompare(b.team)),
    }))
    .sort((a, b) => a.zoneName.localeCompare(b.zoneName));
}
