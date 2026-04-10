"use client";

import {
  DeathsSection,
  EfficiencySection,
  RotationDeathsSection,
  SwapsSection,
  TimingSection,
  UltimatesSection,
  type DeathsData,
  type EfficiencyData,
  type RotationDeathsData,
  type SwapsData,
  type TimingData,
  type UltimatesData,
} from "@/components/map/analysis/analysis-sections";
import type { SerializedCalibrationData } from "@/data/killfeed-calibration-dto";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MapAbilityTimingAnalysis } from "@/data/scrim/types";
import {
  ArrowRightLeft,
  Crosshair,
  Gauge,
  Route,
  Skull,
  Zap,
} from "lucide-react";
import { useState } from "react";

export type AnalysisCardProps = {
  team1: { name: string; color: string };
  team2: { name: string; color: string };
  deaths: DeathsData;
  ultimates: UltimatesData;
  timing: TimingData;
  efficiency: EfficiencyData;
  swaps: SwapsData;
  rotationDeaths?: RotationDeathsData;
  calibrationData?: SerializedCalibrationData;
  abilityTiming?: MapAbilityTimingAnalysis;
  translations: {
    title: string;
    tabFirstDeaths: string;
    tabUltimates: string;
    tabTiming: string;
    tabEfficiency: string;
    tabSwaps: string;
    tabRotationDeaths?: string;
    footerDeaths: string;
    footerUltimates: string;
    footerTiming: string;
    footerEfficiency: string;
    footerSwaps: string;
    footerRotationDeaths?: string;
    tabAbilityTiming?: string;
    footerAbilityTiming?: string;
  };
};

export function AnalysisCard({
  team1,
  team2,
  deaths,
  ultimates,
  timing,
  efficiency,
  swaps,
  rotationDeaths,
  calibrationData,
  translations: t,
}: AnalysisCardProps) {
  const [activeTab, setActiveTab] = useState("deaths");
  const hasRotationData = rotationDeaths !== undefined;

  const footerText: Record<string, string> = {
    deaths: t.footerDeaths,
    ultimates: t.footerUltimates,
    timing: t.footerTiming,
    efficiency: t.footerEfficiency,
    swaps: t.footerSwaps,
    ...(hasRotationData && t.footerRotationDeaths
      ? { rotationDeaths: t.footerRotationDeaths }
      : {}),
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deaths" onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex w-full flex-wrap sm:w-fit">
            <TabsTrigger value="deaths" className="gap-1.5">
              <Skull className="size-3.5" />
              <span className="hidden sm:inline">{t.tabFirstDeaths}</span>
              <span className="sm:hidden">Deaths</span>
            </TabsTrigger>
            <TabsTrigger value="ultimates" className="gap-1.5">
              <Zap className="size-3.5" />
              <span className="hidden sm:inline">{t.tabUltimates}</span>
              <span className="sm:hidden">Ults</span>
            </TabsTrigger>
            <TabsTrigger value="timing" className="gap-1.5">
              <Crosshair className="size-3.5" />
              <span className="hidden sm:inline">{t.tabTiming}</span>
              <span className="sm:hidden">Timing</span>
            </TabsTrigger>
            <TabsTrigger value="efficiency" className="gap-1.5">
              <Gauge className="size-3.5" />
              <span className="hidden sm:inline">{t.tabEfficiency}</span>
              <span className="sm:hidden">Eff.</span>
            </TabsTrigger>
            <TabsTrigger value="swaps" className="gap-1.5">
              <ArrowRightLeft className="size-3.5" />
              <span className="hidden sm:inline">{t.tabSwaps}</span>
              <span className="sm:hidden">Swaps</span>
            </TabsTrigger>
            {hasRotationData && (
              <TabsTrigger value="rotationDeaths" className="gap-1.5">
                <Route className="size-3.5" />
                <span className="hidden sm:inline">
                  {t.tabRotationDeaths ?? "Rotation Deaths"}
                </span>
                <span className="sm:hidden">Rotation</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent
            value="deaths"
            className="animate-in fade-in-0 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 min-h-[180px] motion-reduce:animate-none"
          >
            <DeathsSection team1={team1} team2={team2} deaths={deaths} />
          </TabsContent>

          <TabsContent
            value="ultimates"
            className="animate-in fade-in-0 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 min-h-[180px] motion-reduce:animate-none"
          >
            <UltimatesSection
              team1={team1}
              team2={team2}
              ultimates={ultimates}
            />
          </TabsContent>

          <TabsContent
            value="timing"
            className="animate-in fade-in-0 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 min-h-[180px] motion-reduce:animate-none"
          >
            <TimingSection team1={team1} team2={team2} timing={timing} />
          </TabsContent>

          <TabsContent
            value="efficiency"
            className="animate-in fade-in-0 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 min-h-[180px] motion-reduce:animate-none"
          >
            <EfficiencySection
              team1={team1}
              team2={team2}
              efficiency={efficiency}
            />
          </TabsContent>

          <TabsContent
            value="swaps"
            className="animate-in fade-in-0 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 min-h-[180px] motion-reduce:animate-none"
          >
            <SwapsSection team1={team1} team2={team2} swaps={swaps} />
          </TabsContent>

          {hasRotationData && (
            <TabsContent
              value="rotationDeaths"
              className="animate-in fade-in-0 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 min-h-[180px] motion-reduce:animate-none"
            >
              <RotationDeathsSection
                team1={team1}
                team2={team2}
                rotationDeaths={rotationDeaths ?? null}
                calibrationData={calibrationData}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-xs">{footerText[activeTab]}</p>
      </CardFooter>
    </Card>
  );
}
