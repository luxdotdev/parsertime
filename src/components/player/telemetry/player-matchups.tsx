"use client";

import type {
  DamageByRoleTotals,
  KillContribution,
  OpponentMatchup,
} from "@/data/map/player-telemetry-types";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { useTranslations } from "next-intl";
import { OpponentRadarChart } from "./opponent-radar-chart";
import { ROLE_COLORS } from "./player-telemetry-chart";

type RoleLabels = { tank: string; damage: string; support: string };

type Props = {
  byTarget: DamageByRoleTotals;
  takenByRole: DamageByRoleTotals;
  killContribution: KillContribution;
  opponents: OpponentMatchup[];
  playerTeam: "Team1" | "Team2";
};

const BIN_LABELS = ["0%", "1-25%", "26-50%", "51-75%", "76%+"];

export function PlayerMatchups({
  byTarget,
  takenByRole,
  killContribution,
  opponents,
  playerTeam,
}: Props) {
  const t = useTranslations("mapPage.player.telemetry");
  const { team1, team2 } = useColorblindMode();
  const teamColor = playerTeam === "Team1" ? team1 : team2;
  const roleLabels: RoleLabels = {
    tank: t("roles.tank"),
    damage: t("roles.damage"),
    support: t("roles.support"),
  };
  const hasOpponents = opponents.some((o) => o.dealt + o.received > 0);

  return (
    <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-2">
      <RoleBar
        title={t("matchups.byTarget.title")}
        totals={byTarget}
        labels={roleLabels}
        emptyLabel={t("matchups.byTarget.empty")}
      />
      <RoleBar
        title={t("matchups.takenByRole.title")}
        totals={takenByRole}
        labels={roleLabels}
        emptyLabel={t("matchups.takenByRole.empty")}
      />

      <div className="bg-card flex flex-col px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
            {t("matchups.killContribution.title")}
          </h3>
          {killContribution.totalKills > 0 && (
            <span className="text-muted-foreground/80 font-mono text-[0.625rem] tracking-[0.06em] uppercase tabular-nums">
              {killContribution.totalKills}{" "}
              {t("matchups.killContribution.killsLabel")}
            </span>
          )}
        </div>
        {killContribution.totalKills === 0 ? (
          <p className="text-muted-foreground mt-5 text-sm">
            {t("matchups.killContribution.empty")}
          </p>
        ) : (
          <>
            <div className="mt-4 flex items-baseline gap-8">
              <Stat
                value={`${killContribution.focusContribution}%`}
                label={t("matchups.killContribution.focus")}
              />
              <Stat
                value={`${killContribution.participation}%`}
                label={t("matchups.killContribution.participation")}
              />
            </div>
            <div className="mt-5 space-y-2">
              {BIN_LABELS.map((label, i) => (
                <Bin
                  key={label}
                  label={label}
                  count={killContribution.bins[i] ?? 0}
                  max={Math.max(1, ...killContribution.bins)}
                  color={teamColor}
                />
              ))}
            </div>
          </>
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

function RoleBar({
  title,
  totals,
  labels,
  emptyLabel,
}: {
  title: string;
  totals: DamageByRoleTotals;
  labels: RoleLabels;
  emptyLabel: string;
}) {
  const roles = [
    {
      key: "tank",
      color: ROLE_COLORS.tank,
      label: labels.tank,
      value: totals.tank,
    },
    {
      key: "damage",
      color: ROLE_COLORS.damage,
      label: labels.damage,
      value: totals.damage,
    },
    {
      key: "support",
      color: ROLE_COLORS.support,
      label: labels.support,
      value: totals.support,
    },
  ];
  const sum = roles.reduce((acc, r) => acc + r.value, 0);

  return (
    <div className="bg-card flex flex-col px-5 py-5">
      <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {title}
      </h3>
      {sum === 0 ? (
        <p className="text-muted-foreground mt-5 text-sm">{emptyLabel}</p>
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
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-2xl leading-tight font-semibold tabular-nums">
        {value}
      </span>
      <span className="text-muted-foreground mt-1 text-xs leading-snug">
        {label}
      </span>
    </div>
  );
}

function Bin({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-12 text-right font-mono text-[11px] tabular-nums">
        {label}
      </span>
      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full"
          style={{ width: `${(count / max) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-6 font-mono text-xs tabular-nums">{count}</span>
    </div>
  );
}
