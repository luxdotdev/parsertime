"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import type { PlayerFsrRole } from "@/data/faceit/player-types";
import { useTranslations } from "next-intl";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

type Props = {
  role: PlayerFsrRole;
};

export function PlayerStatRadar({ role }: Props) {
  const t = useTranslations("faceitPlayerPage");

  const data = role.radar.map((a) => ({
    axis: t(`stat.${a.stat}`),
    value: a.z,
  }));

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow={role.role}
        title={t("radar.title")}
      />
      <div className="w-full">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="var(--border)" strokeOpacity={0.4} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{
                fill: "var(--muted-foreground)",
                fontSize: 11,
                fontFamily: "var(--font-geist-mono, ui-monospace)",
              }}
            />
            <PolarRadiusAxis domain={[-2, 2]} tick={false} axisLine={false} />
            <Radar
              name={role.role}
              dataKey="value"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.25}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
