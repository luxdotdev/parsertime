"use client";

import { StatTrendChart } from "@/components/targets/stat-trend-chart";
import { TargetNarrative } from "@/components/targets/target-narrative";
import { TargetProgressCard } from "@/components/targets/target-progress-card";
import type { ScrimStatPoint, TargetProgress } from "@/data/targets-dto";
import { getStatsForRole, type RoleName } from "@/lib/target-stats";

type Props = {
  playerRole: RoleName;
  scrimStats: ScrimStatPoint[];
  progress: TargetProgress[];
};

export function PlayerTargetsTab({ playerRole, scrimStats, progress }: Props) {
  const roleStats = getStatsForRole(playerRole);

  if (progress.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-8 text-center shadow">
        <p className="text-muted-foreground">
          No targets have been set by your coach yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 space-y-4 lg:col-span-4">
          {progress.map((p) => {
            const statConfig = roleStats.find((s) => s.key === p.target.stat);
            if (!statConfig) return null;

            return (
              <div key={p.target.id} className="space-y-2">
                <StatTrendChart
                  stat={p.target.stat}
                  scrimStats={scrimStats}
                  target={p.target}
                  progressPercent={p.progressPercent}
                  currentValue={p.currentValue}
                  trending={p.trending}
                />
                <TargetNarrative progress={p} />
              </div>
            );
          })}
        </div>
        <div className="col-span-3 lg:col-span-3">
          <TargetProgressCard progress={progress} />
        </div>
      </div>
    </div>
  );
}
