"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceIndicator } from "@/components/scouting/confidence-indicator";
import type {
  PlayerHeroDepth,
  PlayerIntelligence,
  PlayerVulnerability,
} from "@/data/player-intelligence-dto";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Shield,
  User,
} from "lucide-react";

type PlayerMatchupsProps = {
  playerIntelligence: PlayerIntelligence | null;
  hasUserTeamLink: boolean;
};

export function PlayerMatchups({
  playerIntelligence,
  hasUserTeamLink,
}: PlayerMatchupsProps) {
  if (!hasUserTeamLink || !playerIntelligence) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Info
            className="text-muted-foreground h-8 w-8"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">
              Select your team to unlock player analysis
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Use the &ldquo;Scouting for&rdquo; picker above to select your
              team and see player vulnerability profiles and hero depth analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { playerDepths, vulnerabilities } = playerIntelligence;

  const roleGroups = groupByRole(playerDepths);
  const vulnByPlayer = new Map(
    vulnerabilities.map((v) => [v.playerName, v])
  );

  const topVulnerabilities = getTopVulnerabilityPerRole(vulnerabilities);

  return (
    <div className="space-y-4">
      {topVulnerabilities.length > 0 && (
        <VulnerabilityOverview vulnerabilities={topVulnerabilities} />
      )}

      {(["Tank", "Damage", "Support"] as const).map((role) => {
        const players = roleGroups.get(role);
        if (!players || players.length === 0) return null;
        return (
          <RoleSection
            key={role}
            role={role}
            players={players}
            vulnByPlayer={vulnByPlayer}
          />
        );
      })}
    </div>
  );
}

function VulnerabilityOverview({
  vulnerabilities,
}: {
  vulnerabilities: PlayerVulnerability[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vulnerability Overview</CardTitle>
        <CardDescription>
          Highest-vulnerability player per role based on hero depth and opponent
          ban targeting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {vulnerabilities.map((v) => (
            <div
              key={v.playerName}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2",
                v.riskLevel === "critical"
                  ? "border-red-500/30 bg-red-500/5"
                  : v.riskLevel === "high"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border"
              )}
            >
              <VulnerabilityIcon riskLevel={v.riskLevel} />
              <div>
                <p className="text-sm font-medium">{v.playerName}</p>
                <p className="text-muted-foreground text-xs">
                  {v.role} · {v.primaryHero} ·{" "}
                  {Math.round(v.opponentBanRate)}% ban rate
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RoleSection({
  role,
  players,
  vulnByPlayer,
}: {
  role: string;
  players: PlayerHeroDepth[];
  vulnByPlayer: Map<string, PlayerVulnerability>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4" aria-hidden="true" />
          {role}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {players.map((player) => (
          <PlayerProfile
            key={player.playerName}
            player={player}
            vulnerability={vulnByPlayer.get(player.playerName)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function PlayerProfile({
  player,
  vulnerability,
}: {
  player: PlayerHeroDepth;
  vulnerability?: PlayerVulnerability;
}) {
  const primary = player.heroes[0];
  const secondary = player.heroes[1];

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{player.playerName}</p>
          <p className="text-muted-foreground text-xs">
            {primary?.hero ?? "Unknown"} ·{" "}
            {secondary?.hero ?? "No secondary"}
          </p>
        </div>
        <ConfidenceIndicator
          confidence={player.confidence}
          size="sm"
        />
      </div>

      <div className="mt-3 space-y-2">
        {player.heroes.slice(0, 3).map((hero) => (
          <ZScoreBar
            key={hero.hero}
            hero={hero.hero}
            zScore={hero.compositeZScore}
            isPrimary={hero.isPrimary}
          />
        ))}
      </div>

      {player.primarySecondaryDelta !== null && (
        <div className="mt-2">
          <p className="text-muted-foreground text-xs tabular-nums">
            Delta: {player.primarySecondaryDelta > 0 ? "−" : "+"}
            {Math.abs(player.primarySecondaryDelta).toFixed(1)}σ
            {player.primarySecondaryDelta > 1.5 && (
              <span className="ml-1 text-amber-600 dark:text-amber-400">
                Significant drop-off
              </span>
            )}
          </p>
        </div>
      )}

      {vulnerability && vulnerability.riskLevel !== "low" && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-500/5 px-3 py-2 text-xs">
          <VulnerabilityIcon riskLevel={vulnerability.riskLevel} />
          <div>
            <p className="font-medium">
              Opponent ban exposure:{" "}
              <span className="uppercase">{vulnerability.riskLevel}</span>
            </p>
            <p className="text-muted-foreground">
              Primary hero banned in{" "}
              {Math.round(vulnerability.opponentBanRate)}% of opponent maps
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ZScoreBar({
  hero,
  zScore,
  isPrimary,
}: {
  hero: string;
  zScore: number;
  isPrimary: boolean;
}) {
  const maxZScore = 3;
  const normalizedWidth = Math.min(
    Math.max((zScore + maxZScore) / (2 * maxZScore), 0),
    1
  );

  return (
    <div className="flex items-center gap-3">
      <div className="flex w-24 items-center gap-1.5 shrink-0">
        <span className="truncate text-xs">{hero}</span>
        {isPrimary && (
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            1st
          </Badge>
        )}
      </div>
      <div className="bg-muted relative h-4 flex-1 overflow-hidden rounded-sm">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-sm transition-all",
            "motion-safe:animate-in motion-safe:slide-in-from-left-0",
            isPrimary
              ? "bg-chart-1"
              : "bg-chart-2"
          )}
          style={{ width: `${normalizedWidth * 100}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums">
        {zScore >= 0 ? "+" : ""}
        {zScore.toFixed(1)}σ
      </span>
    </div>
  );
}

function VulnerabilityIcon({
  riskLevel,
}: {
  riskLevel: PlayerVulnerability["riskLevel"];
}) {
  if (riskLevel === "critical") {
    return (
      <AlertTriangle
        className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400"
        aria-label="Critical vulnerability"
      />
    );
  }
  if (riskLevel === "high") {
    return (
      <AlertTriangle
        className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
        aria-label="High vulnerability"
      />
    );
  }
  if (riskLevel === "moderate") {
    return (
      <Shield
        className="text-muted-foreground h-3.5 w-3.5 shrink-0"
        aria-label="Moderate vulnerability"
      />
    );
  }
  return (
    <CheckCircle2
      className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
      aria-label="Low vulnerability"
    />
  );
}

function groupByRole(
  players: PlayerHeroDepth[]
): Map<string, PlayerHeroDepth[]> {
  const groups = new Map<string, PlayerHeroDepth[]>();
  for (const player of players) {
    const existing = groups.get(player.role) ?? [];
    existing.push(player);
    groups.set(player.role, existing);
  }
  return groups;
}

function getTopVulnerabilityPerRole(
  vulnerabilities: PlayerVulnerability[]
): PlayerVulnerability[] {
  const result: PlayerVulnerability[] = [];
  const seen = new Set<string>();

  for (const vuln of vulnerabilities) {
    if (vuln.riskLevel === "low") continue;
    if (seen.has(vuln.role)) continue;
    seen.add(vuln.role);
    result.push(vuln);
  }

  return result;
}
