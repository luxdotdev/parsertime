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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ScrimOverviewData } from "@/data/scrim-overview-dto";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import {
  ArrowRightLeft,
  ChevronsDownUp,
  ChevronsUpDown,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

const ALL_SECTIONS = ["players", "fights", "ultimates", "swaps"];

export function ScrimOverviewTabs({ data }: { data: ScrimOverviewData }) {
  const [activeTab, setActiveTab] = useState("visualizations");
  const [openSections, setOpenSections] = useState<string[]>(["players"]);
  const { team1: team1Color, team2: team2Color } = useColorblindMode();

  const allExpanded = openSections.length === ALL_SECTIONS.length;

  function toggleAll() {
    setOpenSections(allExpanded ? [] : [...ALL_SECTIONS]);
  }

  const team1 = {
    name: data.ourTeamName || "Your Team",
    color: team1Color,
  };
  const team2 = {
    name: data.opponentTeamName || "Opponent",
    color: team2Color,
  };
  const teamNames = [team1.name, team2.name] as const;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
          <TabsTrigger value="raw-stats">Raw Stats</TabsTrigger>
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
                Collapse all
              </>
            ) : (
              <>
                <ChevronsUpDown className="size-3.5" aria-hidden="true" />
                Expand all
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
                Player Performance
              </span>
            </AccordionTrigger>
            <AccordionContent className="h-auto">
              <ScrimPlayersSection
                players={data.teamPlayers}
                insights={data.insights}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fights">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Swords
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                Fights
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

          <AccordionItem value="ultimates">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Zap
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                Ultimates
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

          <AccordionItem value="swaps">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <ArrowRightLeft
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                Hero Swaps
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
