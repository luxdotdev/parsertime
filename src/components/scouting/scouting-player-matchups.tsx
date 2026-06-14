"use client";

import { DivergingBar, MeterBar } from "@/components/faceit/viz";
import { SectionHeader } from "@/components/stats/team/section-header";
import type {
  PlayerHeroDepth,
  PlayerIntelligence,
  PlayerVulnerability,
} from "@/data/player/types";
import { cn } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";

type Role = "Tank" | "Damage" | "Support";
type RiskLevel = PlayerVulnerability["riskLevel"];

const ROLE_ORDER: Role[] = ["Tank", "Damage", "Support"];
const Z_MAGNITUDE = 3;

type Props = {
  playerIntelligence: PlayerIntelligence | null;
  hasUserTeamLink: boolean;
  opponentName: string;
};

export function ScoutingPlayerMatchups({
  playerIntelligence,
  hasUserTeamLink,
  opponentName,
}: Props) {
  const t = useTranslations("scoutingPage.team.players");
  const format = useFormatter();

  const playerDepths = playerIntelligence?.playerDepths;
  const vulnerabilities = playerIntelligence?.vulnerabilities;
  const bestPlayer = playerIntelligence?.bestPlayer ?? null;

  const roleGroups = useMemo(
    () => groupByRole(playerDepths ?? []),
    [playerDepths]
  );

  const atRisk = useMemo(
    () =>
      (vulnerabilities ?? [])
        .filter((v) => v.riskLevel !== "low")
        .sort((a, b) => b.vulnerabilityIndex - a.vulnerabilityIndex),
    [vulnerabilities]
  );

  if (!hasUserTeamLink || !playerIntelligence) {
    return (
      <section className="space-y-5">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />
        <div className="border-border rounded-md border border-dashed px-4 py-6">
          <p className="text-foreground text-sm font-medium">
            {t("selectTeamTitle")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("selectTeamDescription")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />

      <p className="text-muted-foreground text-sm">
        {t.rich("matchupSummary", {
          opponentName,
          roster: (chunks) => (
            <span className="text-foreground font-medium">{chunks}</span>
          ),
          opponent: (chunks) => (
            <span className="text-foreground font-medium">{chunks}</span>
          ),
        })}
      </p>

      {bestPlayer ? (
        <div className="space-y-3">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            {t("bestPlayer")}
          </p>
          <div className="border-border space-y-2 rounded-md border px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-foreground font-medium">
                {bestPlayer.playerName}
              </span>
              <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                {roleLabel(t, bestPlayer.role)}
              </span>
              <span className="text-muted-foreground text-xs">
                {bestPlayer.primaryHero}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_2.75rem] items-center gap-3">
              <DivergingBar
                value={bestPlayer.compositeZScore}
                magnitude={Z_MAGNITUDE}
                positiveTone="primary"
              />
              <span
                className={cn(
                  "text-right font-mono text-xs tabular-nums",
                  bestPlayer.compositeZScore >= 0
                    ? "text-primary"
                    : "text-destructive"
                )}
              >
                {sigma(t, format, bestPlayer.compositeZScore)}
              </span>
            </div>
            <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase tabular-nums">
              {t("mapsPlayed", { count: bestPlayer.mapsPlayed })}
            </p>
            {bestPlayer.isTargetedByBans ? (
              <p className="text-destructive text-xs">
                {t("standoutBanTarget", {
                  banRate: percent(format, bestPlayer.banTargetRate),
                })}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {atRisk.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
              {t("atRiskPlayers")}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("atRiskPlayersDescription")}
            </p>
          </div>
          <ul className="border-border divide-y divide-[var(--border)] overflow-hidden rounded-md border">
            {atRisk.map((v) => (
              <li
                key={v.playerName}
                className="hover:bg-muted/30 space-y-2 px-4 py-3 transition-colors"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-foreground font-medium">
                      {v.playerName}
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                      {roleLabel(t, v.role)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {v.primaryHero}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[10px] tracking-[0.16em] uppercase",
                      riskTone(v.riskLevel) === "destructive"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {riskLabel(t, v.riskLevel)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {t("vulnerabilitySummary", {
                    role: roleLabel(t, v.role),
                    hero: v.primaryHero,
                    banRate: percent(format, v.opponentBanRate),
                  })}
                </p>
                <MeterBar
                  value={v.opponentBanRate}
                  max={100}
                  tone="destructive"
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ROLE_ORDER.map((role) => {
        const players = roleGroups.get(role);
        if (!players || players.length === 0) return null;
        const localizedRole = roleLabel(t, role);
        return (
          <div key={role} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                {t("rolePlayers", { role: localizedRole })}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("roleDescription", { role: localizedRole })}
              </p>
            </div>
            <ul className="border-border divide-y divide-[var(--border)] overflow-hidden rounded-md border">
              {players.map((player) => (
                <li
                  key={player.playerName}
                  className="hover:bg-muted/30 space-y-2.5 px-4 py-3 transition-colors"
                >
                  <span className="text-foreground font-medium">
                    {player.playerName}
                  </span>
                  <ul className="space-y-2">
                    {[...player.heroes]
                      .sort((a, b) => b.compositeZScore - a.compositeZScore)
                      .slice(0, 3)
                      .map((hero) => (
                        <li
                          key={hero.hero}
                          className="grid grid-cols-[7.5rem_1fr_2.75rem] items-center gap-3 text-sm"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="text-foreground truncate">
                              {hero.hero}
                            </span>
                            {hero.isPrimary ? (
                              <span className="text-muted-foreground border-border shrink-0 rounded-sm border px-1 font-mono text-[9px] tracking-[0.16em] uppercase">
                                {t("primaryBadge")}
                              </span>
                            ) : null}
                          </span>
                          <DivergingBar
                            value={hero.compositeZScore}
                            magnitude={Z_MAGNITUDE}
                          />
                          <span
                            className={cn(
                              "text-right font-mono tabular-nums",
                              hero.compositeZScore >= 0
                                ? "text-primary"
                                : "text-muted-foreground"
                            )}
                          >
                            {sigma(t, format, hero.compositeZScore)}
                          </span>
                        </li>
                      ))}
                  </ul>
                  {player.primarySecondaryDelta != null &&
                  player.primarySecondaryDelta > 1.5 ? (
                    <p className="text-destructive font-mono text-[10px] tracking-[0.16em] uppercase">
                      {t("significantDropOff")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function sigma(
  t: ReturnType<typeof useTranslations>,
  format: ReturnType<typeof useFormatter>,
  value: number
): string {
  return t("sigmaValue", {
    sign: value >= 0 ? "+" : "−",
    value: format.number(Math.abs(value), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
  });
}

function percent(
  format: ReturnType<typeof useFormatter>,
  rate: number
): string {
  return format.number(rate / 100, {
    style: "percent",
    maximumFractionDigits: 0,
  });
}

function roleLabel(
  t: ReturnType<typeof useTranslations>,
  role: string
): string {
  switch (role) {
    case "Tank":
      return t("roles.tank");
    case "Damage":
      return t("roles.damage");
    case "Support":
      return t("roles.support");
    default:
      return role;
  }
}

function riskLabel(
  t: ReturnType<typeof useTranslations>,
  riskLevel: RiskLevel
): string {
  switch (riskLevel) {
    case "critical":
      return t("riskLevels.critical");
    case "high":
      return t("riskLevels.high");
    case "moderate":
      return t("riskLevels.moderate");
    case "low":
      return t("riskLevels.low");
  }
}

function riskTone(riskLevel: RiskLevel): "destructive" | "muted" {
  return riskLevel === "critical" || riskLevel === "high"
    ? "destructive"
    : "muted";
}

function groupByRole(players: PlayerHeroDepth[]): Map<Role, PlayerHeroDepth[]> {
  const groups = new Map<Role, PlayerHeroDepth[]>();
  for (const player of players) {
    const existing = groups.get(player.role) ?? [];
    existing.push(player);
    groups.set(player.role, existing);
  }
  return groups;
}
