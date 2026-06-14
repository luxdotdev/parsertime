"use client";

import { PlayerPerformanceTable } from "@/components/scrim/player-performance-table";
import {
  FightAnalysisSection,
  HeroSwapAnalysisSection,
  UltAnalysisSection,
} from "@/components/scrim/scrim-raw-stats-sections";
import {
  ScrimFightsSection,
  ScrimPlayersSection,
  ScrimSwapsSection,
  ScrimUltimatesSection,
} from "@/components/scrim/scrim-overview-sections";
import { ScrimAbilityTimingSection } from "@/components/scrim/scrim-ability-timing-section";
import { ScrimInitiationSection } from "@/components/scrim/scrim-initiation-section";
import { PositionalStatsSection } from "@/components/scrim/positional-stats-section";
import { UltEconomyCard } from "@/components/stats/team/ult-economy-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScrimPositionalArtifacts } from "@/data/scrim/positional-artifacts-service";
import type { ScrimPositionalStats } from "@/data/scrim/positional-stats-service";
import type { ScrimInitiationData, ScrimOverviewData } from "@/data/scrim/types";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import {
  Activity,
  ArrowRightLeft,
  ChevronsDownUp,
  ChevronsUpDown,
  Crosshair,
  Gauge,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ScrimOverviewTabs({
  data,
  positionalStats = null,
  positionalArtifacts = null,
  initiation = null,
}: {
  data: ScrimOverviewData;
  positionalStats?: ScrimPositionalStats | null;
  positionalArtifacts?: ScrimPositionalArtifacts | null;
  initiation?: ScrimInitiationData | null;
}) {
  const t = useTranslations("scrimPage.overviewTabs");
  const hasAbilityData = data.abilityTimingAnalysis.rows.length > 0;
  const hasUltEconomy = data.ultEconomy.totalFights > 0;
  const hasPositional =
    positionalStats !== null && positionalStats.players.length > 0;
  const hasInitiation = initiation !== null && initiation.teams.length > 0;
  const allSections = [
    "players",
    "fights",
    ...(hasAbilityData ? ["abilities"] : []),
    "ultimates",
    ...(hasUltEconomy ? ["ult-advantage"] : []),
    "swaps",
    ...(hasPositional ? ["positional"] : []),
    ...(hasInitiation ? ["initiation"] : []),
  ];

  const [activeTab, setActiveTab] = useState("visualizations");
  const [openSections, setOpenSections] = useState<string[]>(["players"]);
  const { team1: team1Color, team2: team2Color } = useColorblindMode();

  const allExpanded = openSections.length === allSections.length;

  function toggleAll() {
    setOpenSections(allExpanded ? [] : [...allSections]);
  }

  const team1 = {
    name: data.ourTeamName || t("team.yourTeam"),
    color: team1Color,
  };
  const team2 = {
    name: data.opponentTeamName || t("team.opponent"),
    color: team2Color,
  };
  const teamNames = [team1.name, team2.name] as const;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="visualizations">
            {t("tabs.visualizations")}
          </TabsTrigger>
          <TabsTrigger value="raw-stats">{t("tabs.rawStats")}</TabsTrigger>
        </TabsList>
        {activeTab === "visualizations" && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-[color] active:scale-[0.96]"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="size-3.5" aria-hidden="true" />
                {t("actions.collapseAll")}
              </>
            ) : (
              <>
                <ChevronsUpDown className="size-3.5" aria-hidden="true" />
                {t("actions.expandAll")}
              </>
            )}
          </button>
        )}
      </div>

      <TabsContent value="visualizations">
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
        >
          <AccordionItem value="players">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Users
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                {t("sections.players")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="h-auto">
              <ScrimPlayersSection players={data.teamPlayers} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fights">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Swords
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                {t("sections.fights")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="h-auto">
              <ScrimFightsSection
                analysis={data.fightAnalysis}
                team1={team1}
                team2={team2}
              />
            </AccordionContent>
          </AccordionItem>

          {data.abilityTimingAnalysis.rows.length > 0 && (
            <AccordionItem value="abilities">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Activity
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                  {t("sections.abilities")}
                </span>
              </AccordionTrigger>
              <AccordionContent className="h-auto">
                <ScrimAbilityTimingSection
                  analysis={data.abilityTimingAnalysis}
                />
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="ultimates">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Zap
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                {t("sections.ultimates")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="h-auto">
              <ScrimUltimatesSection
                analysis={data.ultAnalysis}
                team1={team1}
                team2={team2}
              />
            </AccordionContent>
          </AccordionItem>

          {hasUltEconomy && (
            <AccordionItem value="ult-advantage">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Gauge
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                  {t("sections.ultAdvantage")}
                </span>
              </AccordionTrigger>
              <AccordionContent className="h-auto">
                <UltEconomyCard analysis={data.ultEconomy} />
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="swaps">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <ArrowRightLeft
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                {t("sections.swaps")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="h-auto">
              <ScrimSwapsSection
                analysis={data.swapAnalysis}
                team1={team1}
                team2={team2}
              />
            </AccordionContent>
          </AccordionItem>

          {hasPositional && positionalStats && (
            <AccordionItem value="positional">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Crosshair
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                  {t("sections.positional")}
                </span>
              </AccordionTrigger>
              <AccordionContent className="h-auto">
                <PositionalStatsSection
                  data={positionalStats}
                  artifacts={positionalArtifacts}
                />
              </AccordionContent>
            </AccordionItem>
          )}

          {hasInitiation && initiation && (
            <AccordionItem value="initiation">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Swords
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                  {t("sections.initiation")}
                </span>
              </AccordionTrigger>
              <AccordionContent className="h-auto">
                <ScrimInitiationSection initiation={initiation} />
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </TabsContent>

      <TabsContent value="raw-stats">
        <div className="space-y-6">
          <PlayerPerformanceTable players={data.teamPlayers} />
          <FightAnalysisSection analysis={data.fightAnalysis} />
          <HeroSwapAnalysisSection analysis={data.swapAnalysis} />
          <UltAnalysisSection
            analysis={data.ultAnalysis}
            teamNames={teamNames}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
