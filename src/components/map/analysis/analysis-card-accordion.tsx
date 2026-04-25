"use client";

import {
  DeathsSection,
  EfficiencySection,
  RotationDeathsSection,
  SwapsSection,
  TimingSection,
  UltimatesSection,
} from "@/components/map/analysis/analysis-sections";
import type { AnalysisCardProps } from "@/components/map/analysis/analysis-card";
import { MapAbilityTimingSection } from "@/components/map/analysis/map-ability-timing-section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  ArrowRightLeft,
  ChevronsDownUp,
  ChevronsUpDown,
  Crosshair,
  Gauge,
  Route,
  Skull,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const BASE_SECTIONS = ["deaths", "ultimates", "timing", "efficiency", "swaps"];

export function AnalysisCardAccordion({
  team1,
  team2,
  deaths,
  ultimates,
  timing,
  efficiency,
  swaps,
  rotationDeaths,
  calibrationData,
  abilityTiming,
  translations: t,
}: AnalysisCardProps) {
  const tAnalysis = useTranslations("mapPage.overview.analysis");
  const hasAbilityData =
    abilityTiming &&
    (abilityTiming.team1.rows.length > 0 ||
      abilityTiming.team2.rows.length > 0);
  const hasRotationData = rotationDeaths !== undefined;
  const allSections = [
    ...BASE_SECTIONS,
    ...(hasRotationData ? ["rotationDeaths"] : []),
    ...(hasAbilityData ? ["abilities"] : []),
  ];

  const [openSections, setOpenSections] = useState<string[]>(["deaths"]);
  const allExpanded = openSections.length === allSections.length;

  function toggleAll() {
    setOpenSections(allExpanded ? [] : [...allSections]);
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-balance">{t.title}</CardTitle>
        <CardAction>
          <button
            type="button"
            onClick={toggleAll}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-[color] active:scale-[0.96] motion-reduce:active:scale-100"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="size-3.5" aria-hidden="true" />
                {tAnalysis("collapseAll")}
              </>
            ) : (
              <>
                <ChevronsUpDown className="size-3.5" aria-hidden="true" />
                {tAnalysis("expandAll")}
              </>
            )}
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
        >
          <AccordionItem value="deaths">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Skull
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                {t.tabFirstDeaths}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <DeathsSection team1={team1} team2={team2} deaths={deaths} />
              <p className="text-muted-foreground mt-3 text-xs text-pretty">
                {t.footerDeaths}
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ultimates">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Zap
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                {t.tabUltimates}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <UltimatesSection
                team1={team1}
                team2={team2}
                ultimates={ultimates}
              />
              <p className="text-muted-foreground mt-3 text-xs text-pretty">
                {t.footerUltimates}
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="timing">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Crosshair
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                {t.tabTiming}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <TimingSection team1={team1} team2={team2} timing={timing} />
              <p className="text-muted-foreground mt-3 text-xs text-pretty">
                {t.footerTiming}
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="efficiency">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Gauge
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                {t.tabEfficiency}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <EfficiencySection
                team1={team1}
                team2={team2}
                efficiency={efficiency}
              />
              <p className="text-muted-foreground mt-3 text-xs text-pretty">
                {t.footerEfficiency}
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="swaps">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <ArrowRightLeft
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                {t.tabSwaps}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <SwapsSection team1={team1} team2={team2} swaps={swaps} />
              <p className="text-muted-foreground mt-3 text-xs text-pretty">
                {t.footerSwaps}
              </p>
            </AccordionContent>
          </AccordionItem>

          {hasRotationData && (
            <AccordionItem value="rotationDeaths">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Route
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                  {t.tabRotationDeaths ?? tAnalysis("tabRotationDeaths")}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <RotationDeathsSection
                  team1={team1}
                  team2={team2}
                  rotationDeaths={rotationDeaths ?? null}
                  calibrationData={calibrationData}
                />
                {t.footerRotationDeaths && (
                  <p className="text-muted-foreground mt-3 text-xs text-pretty">
                    {t.footerRotationDeaths}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {hasAbilityData && abilityTiming && (
            <AccordionItem value="abilities">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Activity
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                  {t.tabAbilityTiming ?? tAnalysis("tabAbilityTiming")}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <MapAbilityTimingSection
                  analysis={abilityTiming}
                  team1={team1}
                  team2={team2}
                />
                {t.footerAbilityTiming && (
                  <p className="text-muted-foreground mt-3 text-xs text-pretty">
                    {t.footerAbilityTiming}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
