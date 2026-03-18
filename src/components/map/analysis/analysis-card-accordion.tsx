"use client";

import {
  DeathsSection,
  EfficiencySection,
  SwapsSection,
  TimingSection,
  UltimatesSection,
} from "@/components/map/analysis/analysis-sections";
import type { AnalysisCardProps } from "@/components/map/analysis/analysis-card";
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
  ArrowRightLeft,
  ChevronsDownUp,
  ChevronsUpDown,
  Crosshair,
  Gauge,
  Skull,
  Zap,
} from "lucide-react";
import { useState } from "react";

const ALL_SECTIONS = ["deaths", "ultimates", "timing", "efficiency", "swaps"];

export function AnalysisCardAccordion({
  team1,
  team2,
  deaths,
  ultimates,
  timing,
  efficiency,
  swaps,
  translations: t,
}: AnalysisCardProps) {
  const [openSections, setOpenSections] = useState<string[]>(["deaths"]);
  const allExpanded = openSections.length === ALL_SECTIONS.length;

  function toggleAll() {
    setOpenSections(allExpanded ? [] : [...ALL_SECTIONS]);
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-balance">{t.title}</CardTitle>
        <CardAction>
          <button
            type="button"
            onClick={toggleAll}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-[color] active:scale-[0.96]"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="size-3.5" aria-hidden="true" />
                Collapse all
              </>
            ) : (
              <>
                <ChevronsUpDown className="size-3.5" aria-hidden="true" />
                Expand all
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
        </Accordion>
      </CardContent>
    </Card>
  );
}
