"use client";

import type {
  DamageByRoleTotals,
  OpponentMatchup,
} from "@/data/map/player-telemetry-types";
import { useTranslations } from "next-intl";
import { OpponentRadarChart } from "./opponent-radar-chart";
import { ROLE_COLORS } from "./player-telemetry-chart";

type Props = {
  totals: DamageByRoleTotals;
  opponents: OpponentMatchup[];
  playerTeam: "Team1" | "Team2";
};

export function PlayerMatchups({ totals, opponents, playerTeam }: Props) {
  const t = useTranslations("mapPage.player.telemetry");

  const roles = [
    {
      key: "tank",
      color: ROLE_COLORS.tank,
      label: t("roles.tank"),
      value: totals.tank,
    },
    {
      key: "damage",
      color: ROLE_COLORS.damage,
      label: t("roles.damage"),
      value: totals.damage,
    },
    {
      key: "support",
      color: ROLE_COLORS.support,
      label: t("roles.support"),
      value: totals.support,
    },
  ];
  const sum = roles.reduce((acc, r) => acc + r.value, 0);
  const hasOpponents = opponents.some((o) => o.dealt + o.received > 0);

  return (
    <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-2">
      <div className="bg-card flex flex-col px-5 py-5">
        <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          {t("matchups.byTarget.title")}
        </h3>
        {sum === 0 ? (
          <p className="text-muted-foreground mt-5 text-sm">
            {t("matchups.byTarget.empty")}
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            <div
              className="bg-muted flex h-3 w-full overflow-hidden rounded-full"
              role="img"
              aria-label={roles
                .map((r) => `${r.label} ${Math.round((r.value / sum) * 100)}%`)
                .join(", ")}
            >
              {roles.map((r) =>
                r.value > 0 ? (
                  <div
                    key={r.key}
                    style={{
                      width: `${(r.value / sum) * 100}%`,
                      backgroundColor: r.color,
                    }}
                  />
                ) : null
              )}
            </div>
            <dl className="space-y-2">
              {roles.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-between gap-4"
                >
                  <dt className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-[3px]"
                      style={{ backgroundColor: r.color }}
                      aria-hidden="true"
                    />
                    {r.label}
                  </dt>
                  <dd className="flex items-baseline gap-2 font-mono tabular-nums">
                    <span>{Math.round(r.value).toLocaleString()}</span>
                    <span className="text-muted-foreground text-xs">
                      {Math.round((r.value / sum) * 100)}%
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      <div className="bg-card flex flex-col px-5 py-5">
        <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          {t("matchups.radar.title")}
        </h3>
        {hasOpponents ? (
          <div className="mt-2 min-w-0">
            <OpponentRadarChart
              opponents={opponents}
              playerTeam={playerTeam}
              labels={{
                dealt: t("matchups.radar.dealt"),
                received: t("matchups.radar.received"),
              }}
            />
          </div>
        ) : (
          <p className="text-muted-foreground mt-5 text-sm">
            {t("matchups.radar.empty")}
          </p>
        )}
      </div>
    </div>
  );
}
