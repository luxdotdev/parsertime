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
  {
    titleKey: "presetDamageHealingReceived",
    x: "damage_taken",
    y: "healing_received",
  },
  { titleKey: "presetBlockedTaken", x: "damage_blocked", y: "damage_taken" },
];

/**
 * X/Y axis pickers for the custom chart. Rendered both inline and inside the
 * expanded inspector, so `idPrefix` keeps the label/control ids unique.
 */
function AxisSelectors({
  idPrefix,
  xAxisLabel,
  yAxisLabel,
  xValue,
  yValue,
  onX,
  onY,
  statLabel,
}: {
  idPrefix: string;
  xAxisLabel: string;
  yAxisLabel: string;
  xValue: ScatterStatKey;
  yValue: ScatterStatKey;
  onX: (value: ScatterStatKey) => void;
  onY: (value: ScatterStatKey) => void;
  statLabel: (key: ScatterStatKey) => string;
}) {
  const axes = [
    {
      id: `${idPrefix}-x-axis`,
      label: xAxisLabel,
      value: xValue,
      onChange: onX,
    },
    {
      id: `${idPrefix}-y-axis`,
      label: yAxisLabel,
      value: yValue,
      onChange: onY,
    },
  ];
  return (
    <div className="flex flex-wrap items-end gap-4">
      {axes.map((axis) => (
        <div key={axis.id} className="space-y-1.5">
          <Label htmlFor={axis.id} className="text-xs">
            {axis.label}
          </Label>
          <Select
            value={axis.value}
            onValueChange={(v) => axis.onChange(v as ScatterStatKey)}
          >
            <SelectTrigger id={axis.id} className="w-[220px]">
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
      ))}
    </div>
  );
}

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

        <AxisSelectors
          idPrefix="custom"
          xAxisLabel={t("xAxis")}
          yAxisLabel={t("yAxis")}
          xValue={customX}
          yValue={customY}
          onX={setCustomX}
          onY={setCustomY}
          statLabel={statLabel}
        />

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
          axisControls={
            <AxisSelectors
              idPrefix="custom-expanded"
              xAxisLabel={t("xAxis")}
              yAxisLabel={t("yAxis")}
              xValue={customX}
              yValue={customY}
              onX={setCustomX}
              onY={setCustomY}
              statLabel={statLabel}
            />
          }
        />
      </section>
    </div>
  );
}
