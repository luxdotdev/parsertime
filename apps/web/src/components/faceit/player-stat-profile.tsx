"use client";

import { SectionHeader } from "@/components/stats/team/section-header";
import { DivergingBar } from "@/components/faceit/viz";
import type { PlayerFsrRole } from "@/data/faceit/player-types";
import { cn } from "@/lib/utils";
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

const Z_MAGNITUDE = 2;

export function PlayerStatProfile({ role }: Props) {
  const t = useTranslations("faceitPlayerPage");
  const tStat = useTranslations("faceitPlayerPage.stat");

  const radarData = role.radar.map((a) => ({
    axis: tStat(a.stat),
    value: a.z,
  }));

  const ranked = [...role.radar].sort((a, b) => b.z - a.z);

  return (
    <section className="space-y-4">
      <SectionHeader eyebrow={role.role} title={t("radar.title")} />
      <div className="grid items-center gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="var(--border)" strokeOpacity={0.5} />
              <PolarAngleAxis
                dataKey="axis"
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <PolarRadiusAxis
                domain={[-Z_MAGNITUDE, Z_MAGNITUDE]}
                tick={false}
                axisLine={false}
              />
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
        <div className="lg:col-span-7">
          <p className="text-muted-foreground mb-3 font-mono text-[11px] tracking-[0.16em] uppercase">
            {t("radar.vsPeers")}
          </p>
          <ul className="space-y-2.5">
            {ranked.map((axis) => (
              <li
                key={axis.stat}
                className="grid grid-cols-[7.5rem_1fr_2.75rem] items-center gap-3 text-sm"
              >
                <span className="text-foreground truncate">
                  {tStat(axis.stat)}
                </span>
                <DivergingBar value={axis.z} magnitude={Z_MAGNITUDE} />
                <span
                  className={cn(
                    "text-right font-mono tabular-nums",
                    axis.z > 0 ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {axis.z > 0 ? "+" : ""}
                  {axis.z.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
