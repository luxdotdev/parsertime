"use client";

import { PlayerTargetDetail } from "@/components/targets/player-target-detail";
import { Sparkline } from "@/components/targets/sparkline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ScrimStatPoint, TargetProgress } from "@/data/targets-dto";
import type { RoleName } from "@/lib/target-stats";
import { cn } from "@/lib/utils";
import type { PlayerTarget } from "@prisma/client";
import { Lock } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type PlayerOverview = {
  name: string;
  image: string | null;
  role: RoleName;
  targets: (PlayerTarget & {
    creator: { name: string | null; email: string };
  })[];
  scrimStats: ScrimStatPoint[];
  progressMap: Record<number, TargetProgress>;
  isOnTeam: boolean;
};

type Props = {
  players: PlayerOverview[];
  teamId: number;
  hasPerms: boolean;
};

function getOverallStatus(
  progressMap: Record<number, TargetProgress>
): "on-track" | "mixed" | "behind" | "none" {
  const entries = Object.values(progressMap);
  if (entries.length === 0) return "none";

  const onTrack = entries.filter((p) => p.progressPercent >= 75).length;
  const behind = entries.filter((p) => p.progressPercent < 25).length;

  if (onTrack === entries.length) return "on-track";
  if (behind === entries.length) return "behind";
  return "mixed";
}

const statusColors = {
  "on-track": "bg-green-500",
  mixed: "bg-yellow-500",
  behind: "bg-red-500",
  none: "bg-muted-foreground",
};

export function TeamTargetsOverview({ players, teamId, hasPerms }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const selected = players.find((p) => p.name === selectedPlayer && p.isOnTeam);

  if (selected) {
    return (
      <PlayerTargetDetail
        playerName={selected.name}
        teamId={teamId}
        playerRole={selected.role}
        scrimStats={selected.scrimStats}
        targets={selected.targets}
        progressMap={selected.progressMap}
        hasPerms={hasPerms}
        onBack={() => setSelectedPlayer(null)}
      />
    );
  }

  // Show registered players first, then unregistered
  const sorted = [...players].sort((a, b) => {
    if (a.isOnTeam === b.isOnTeam) return 0;
    return a.isOnTeam ? -1 : 1;
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((player) => {
        const status = getOverallStatus(player.progressMap);
        const sparklineData =
          player.scrimStats.length > 0
            ? player.scrimStats.map(
                (s) => s.stats.eliminations ?? s.stats.hero_damage_dealt ?? 0
              )
            : [];

        const trending =
          Object.values(player.progressMap).length > 0
            ? Object.values(player.progressMap).every(
                (p) => p.trending === "toward"
              )
              ? "toward"
              : Object.values(player.progressMap).every(
                    (p) => p.trending === "away"
                  )
                ? "away"
                : "neutral"
            : "neutral";

        if (!player.isOnTeam) {
          return (
            <Card key={player.name} className="min-h-[120px] opacity-50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                    {player.name[0]?.toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{player.name}</span>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {player.role}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Lock className="h-3 w-3" />
                    <span>Add this player to your team to set targets</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card
            key={player.name}
            className={cn(
              "hover:bg-accent/50 cursor-pointer transition-colors",
              "min-h-[120px]"
            )}
            onClick={() => setSelectedPlayer(player.name)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                {player.image ? (
                  <Image
                    src={player.image}
                    alt={player.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                    {player.name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{player.name}</span>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {player.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkline data={sparklineData} trending={trending} />
                  {player.targets.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {player.targets.length} target
                      {player.targets.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      statusColors[status]
                    )}
                    title={status}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {players.length === 0 && (
        <div className="text-muted-foreground col-span-full py-8 text-center">
          No players found in scrims for this team.
        </div>
      )}
    </div>
  );
}
