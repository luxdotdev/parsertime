"use client";

import { PositionalOutcomeBars } from "@/components/positional/positional-outcome-bars";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ZoneCountRow } from "@/lib/zones/analytics";
import { useTranslations } from "next-intl";

type MapZones = { mapName: string; rows: ZoneCountRow[] };

const OUR_COLOR = "var(--primary)";
const OPP_COLOR = "var(--destructive)";

type ZoneControl = {
  label: string;
  won: number;
  lost: number;
  neutral: number;
};

function zoneControlForMap(rows: ZoneCountRow[], ourTeams: Set<string>) {
  const byZone = new Map<string, { won: number; lost: number }>();
  for (const row of rows) {
    const acc = byZone.get(row.zoneName) ?? { won: 0, lost: 0 };
    // "Control" = share of kills won in the zone. Our team's kills (roster-
    // resolved, may span name variants) vs the pooled opponents' kills.
    if (ourTeams.has(row.team)) acc.won += row.kills;
    else acc.lost += row.kills;
    byZone.set(row.zoneName, acc);
  }
  const zones: ZoneControl[] = Array.from(byZone, ([label, c]) => ({
    label,
    won: c.won,
    lost: c.lost,
    neutral: 0,
  }));
  const ourKills = zones.reduce((sum, z) => sum + z.won, 0);
  const oppKills = zones.reduce((sum, z) => sum + z.lost, 0);
  return { zones, ourKills, oppKills };
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-[2px]"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function ZoneControlByMap({
  zonesByMap,
  ourTeamNames,
}: {
  zonesByMap: MapZones[];
  ourTeamNames: string[];
}) {
  const t = useTranslations("teamStatsPage.positional");

  if (zonesByMap.length === 0) return null;

  const ourTeams = new Set(ourTeamNames);
  const ourLabel = ourTeamNames[0] ?? t("zonesYourTeam");
  const oppLabel = t("zonesOpponents");

  const maps = zonesByMap
    .map((map) => ({
      mapName: map.mapName,
      ...zoneControlForMap(map.rows, ourTeams),
    }))
    .sort((a, b) => b.ourKills + b.oppKills - (a.ourKills + a.oppKills));

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.06em] uppercase">
        <LegendChip color={OUR_COLOR} label={ourLabel} />
        <LegendChip color={OPP_COLOR} label={oppLabel} />
      </div>

      <Accordion
        type="multiple"
        className="border-border gap-0 rounded-md border"
      >
        {maps.map((map) => {
          const total = map.ourKills + map.oppKills;
          const control =
            total > 0 ? Math.round((map.ourKills / total) * 100) : null;
          return (
            <AccordionItem
              key={map.mapName}
              value={map.mapName}
              className="px-3 last:border-b-0"
            >
              <AccordionTrigger>
                <span className="flex flex-1 items-center justify-between gap-3 pr-2">
                  <span className="font-medium">{map.mapName}</span>
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {t("zonesCount", { count: map.zones.length })}
                    {control !== null &&
                      ` · ${t("zonesControlPct", { pct: control })}`}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <PositionalOutcomeBars
                  rows={map.zones}
                  labels={{ won: ourLabel, neutral: "", lost: oppLabel }}
                  showLegend={false}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
