"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
  KillPatterns,
  RoleDistributionEntry,
} from "@/data/player/types";
import { toHero } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

type PlayerKillAnalysisProps = {
  killPatterns: KillPatterns;
  roleDistribution: RoleDistributionEntry[];
};

const ROLE_COLORS: Record<string, string> = {
  Tank: "var(--chart-1)",
  Damage: "var(--chart-4)",
  Support: "var(--chart-2)",
};

export function PlayerKillAnalysis({
  killPatterns,
  roleDistribution,
}: PlayerKillAnalysisProps) {
  const t = useTranslations("scoutingPage.player.analytics.killAnalysis");

  const hasKillData =
    killPatterns.topHeroesEliminated.length > 0 ||
    killPatterns.topHeroesDiedTo.length > 0;

  if (!hasKillData && roleDistribution.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="kill-analysis-heading">
      <Card>
        <CardHeader>
          <CardTitle id="kill-analysis-heading">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              {killPatterns.topHeroesEliminated.length > 0 && (
                <HeroList
                  title={t("topTargets")}
                  heroes={killPatterns.topHeroesEliminated}
                  countLabel="kills"
                />
              )}
              {killPatterns.topHeroesDiedTo.length > 0 && (
                <HeroList
                  title={t("topThreats")}
                  heroes={killPatterns.topHeroesDiedTo}
                  countLabel="deaths"
                />
              )}
            </div>

            <div className="space-y-4">
              {killPatterns.killMethods.length > 0 && (
                <KillMethodRadar
                  title={t("killMethods")}
                  methods={killPatterns.killMethods}
                />
              )}
              {roleDistribution.length > 0 && (
                <RoleDistributionChart
                  title={t("roleDistribution")}
                  distribution={roleDistribution}
                />
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">{t("methodology")}</p>
        </CardFooter>
      </Card>
    </section>
  );
}

function HeroList({
  title,
  heroes,
  countLabel,
}: {
  title: string;
  heroes: { hero: string; count: number }[];
  countLabel: string;
}) {
  const t = useTranslations("scoutingPage.player.analytics.killAnalysis");

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      <div className="space-y-2">
        {heroes.map((entry) => (
          <div key={entry.hero} className="flex items-center gap-3">
            <Image
              src={`/heroes/${toHero(entry.hero)}.png`}
              alt={entry.hero}
              width={28}
              height={28}
              className="rounded"
            />
            <span className="flex-1 text-sm">{entry.hero}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {t(countLabel as "kills" | "deaths", { count: entry.count })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KillMethodRadar({
  title,
  methods,
}: {
  title: string;
  methods: { method: string; count: number }[];
}) {
  const chartConfig: ChartConfig = {
    count: {
      label: "Count",
      color: "var(--chart-3)",
    },
  };

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <RadarChart data={methods}>
          <PolarGrid />
          <PolarAngleAxis dataKey="method" tick={{ fontSize: 10 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Radar
            dataKey="count"
            stroke="var(--color-count)"
            fill="var(--color-count)"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ChartContainer>
    </div>
  );
}

function RoleDistributionChart({
  title,
  distribution,
}: {
  title: string;
  distribution: RoleDistributionEntry[];
}) {
  const data = distribution.map((entry) => ({
    name: entry.role,
    value: Math.round(entry.percentage * 10) / 10,
    fill: ROLE_COLORS[entry.role] ?? "var(--chart-5)",
  }));

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            label={({ name, value }) => `${name}: ${value}%`}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
