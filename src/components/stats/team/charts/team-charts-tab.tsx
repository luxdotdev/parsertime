"use client";

import { CorrelationScatter } from "@/components/stats/team/charts/correlation-scatter";
import { SectionHeader } from "@/components/stats/team/section-header";
import { HeroFilter } from "@/components/stats/player/hero-filter";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  type PlayerScatterStats,
  type ScatterStatKey,
  SCATTER_STAT_KEYS,
  SCATTER_STAT_LABEL_KEYS,
} from "@/lib/team-scatter-stats";
import type { HeroName } from "@/types/heroes";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  scatterData: PlayerScatterStats[];
};

const PRESETS: { titleKey: string; x: ScatterStatKey; y: ScatterStatKey }[] = [
  { titleKey: "presetDamageDeaths", x: "hero_damage_dealt", y: "deaths" },
  { titleKey: "presetFinalBlowsDeaths", x: "final_blows", y: "deaths" },
  { titleKey: "presetDamageHealingReceived", x: "damage_taken", y: "healing_received" },
  { titleKey: "presetBlockedTaken", x: "damage_blocked", y: "damage_taken" },
];

export function TeamChartsTab({ scatterData }: Props) {
  const t = useTranslations("teamStatsPage.charts");
  const [selectedHeroes, setSelectedHeroes] = useState<HeroName[]>([]);
  const [showRegression, setShowRegression] = useState(false);
  const [customX, setCustomX] = useState<ScatterStatKey>("hero_damage_dealt");
  const [customY, setCustomY] = useState<ScatterStatKey>("eliminations");

  function statLabel(key: ScatterStatKey): string {
    return t(`stats.${SCATTER_STAT_LABEL_KEYS[key]}` as never);
  }

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          rightSlot={
            <div className="flex flex-wrap items-center gap-4">
              <HeroFilter
                selectedHeroes={selectedHeroes}
                onSelectionChange={setSelectedHeroes}
              />
              <div className="flex items-center gap-2">
                <Switch
                  id="charts-regression"
                  checked={showRegression}
                  onCheckedChange={setShowRegression}
                />
                <Label htmlFor="charts-regression" className="text-xs">
                  {t("regressionToggle")}
                </Label>
              </div>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {PRESETS.map((preset) => (
            <CorrelationScatter
              key={preset.titleKey}
              data={scatterData}
              xStat={preset.x}
              yStat={preset.y}
              xLabel={statLabel(preset.x)}
              yLabel={statLabel(preset.y)}
              selectedHeroes={selectedHeroes}
              showRegression={showRegression}
              title={t(preset.titleKey)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeader
          eyebrow={t("customEyebrow")}
          title={t("customTitle")}
          description={t("customDescription")}
        />

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="custom-x-axis" className="text-xs">{t("xAxis")}</Label>
            <Select
              value={customX}
              onValueChange={(v) => setCustomX(v as ScatterStatKey)}
            >
              <SelectTrigger id="custom-x-axis" className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCATTER_STAT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {statLabel(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-y-axis" className="text-xs">{t("yAxis")}</Label>
            <Select
              value={customY}
              onValueChange={(v) => setCustomY(v as ScatterStatKey)}
            >
              <SelectTrigger id="custom-y-axis" className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCATTER_STAT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {statLabel(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <CorrelationScatter
          data={scatterData}
          xStat={customX}
          yStat={customY}
          xLabel={statLabel(customX)}
          yLabel={statLabel(customY)}
          selectedHeroes={selectedHeroes}
          showRegression={showRegression}
          title={t("customChartTitle", {
            x: statLabel(customX),
            y: statLabel(customY),
          })}
        />
      </section>
    </div>
  );
}
