"use client";

import { StatTrendChart } from "@/components/targets/stat-trend-chart";
import { TargetForm } from "@/components/targets/target-form";
import { TargetNarrative } from "@/components/targets/target-narrative";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ScrimStatPoint, TargetProgress } from "@/data/player/types";
import { type RoleName, getStatsForRole } from "@/lib/target-stats";
import type { PlayerTarget } from "@prisma/client";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  playerName: string;
  teamId: number;
  playerRole: RoleName;
  scrimStats: ScrimStatPoint[];
  targets: (PlayerTarget & {
    creator: { name: string | null; email: string };
  })[];
  progressMap: Record<number, TargetProgress>;
  hasPerms: boolean;
  onBack?: () => void;
};

export function PlayerTargetDetail({
  playerName,
  teamId,
  playerRole,
  scrimStats,
  targets,
  progressMap,
  hasPerms,
  onBack,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<number | null>(null);

  const roleStats = getStatsForRole(playerRole);

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await fetch(`/api/team/targets/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        )}
        <h3 className="text-xl font-semibold">{playerName}</h3>
        <Badge variant="outline">{playerRole}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roleStats.map((statConfig) => {
          const target = targets.find((t) => t.stat === statConfig.key);
          const progress = target ? progressMap[target.id] : undefined;

          return (
            <div key={statConfig.key} className="space-y-2">
              <StatTrendChart
                stat={statConfig.key}
                scrimStats={scrimStats}
                target={target}
                progressPercent={progress?.progressPercent}
                currentValue={progress?.currentValue}
                trending={progress?.trending}
              />
              {progress && <TargetNarrative progress={progress} />}
              {hasPerms && (
                <div className="flex gap-2">
                  <TargetForm
                    teamId={teamId}
                    playerName={playerName}
                    playerRole={playerRole}
                    existingTarget={target}
                    preselectedStat={statConfig.key}
                  />
                  {target && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(target.id)}
                      disabled={deleting === target.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
