import { MapCharts } from "@/components/charts/map/map-charts";
import { ComparePlayers } from "@/components/map/compare-players";
import { DefaultOverview } from "@/components/map/default-overview";
import { FightInitiationInspector } from "@/components/map/fight-initiation-inspector";
import { HeatmapTab } from "@/components/map/heatmap/heatmap-tab";
import { Killfeed } from "@/components/map/killfeed";
import { MapEvents } from "@/components/map/map-events";
import { MatchStoryTab } from "@/components/map/match-story/match-story-tab";
import { ReplayTab } from "@/components/map/replay/replay-tab";
import { RoutesTab } from "@/components/map/routes/routes-tab";
import { TipTap } from "@/components/tiptap/tiptap";
import { VodOverview } from "@/components/vods/vod-overview";
import type { MatchStoryResult } from "@/data/map/match-story-service";
import {
  getFightInitiationForMapData,
  type MapInitiationResult,
} from "@/lib/fight-initiation";

type ActiveMapTabProps = {
  /** The tab currently selected via the `?tab=` search param. */
  activeTab: string;
  id: number;
  mapDataId: number;
  scrimId: number;
  team1Color: string;
  team2Color: string;
  tempoChartEnabled: boolean;
  positionalDataEnabled: boolean;
  matchStory: MatchStoryResult | null;
  noteContent: string;
  vod: string;
};

/**
 * Renders the content for the single active map tab. Only the selected tab's
 * server component is rendered (and only it fetches its data), so the map page
 * no longer pays for every tab's queries on each load. Switching tabs is a
 * shallow:false navigation that re-renders this with a new `activeTab`.
 */
export async function ActiveMapTab({
  activeTab,
  id,
  mapDataId,
  scrimId,
  team1Color,
  team2Color,
  tempoChartEnabled,
  positionalDataEnabled,
  matchStory,
  noteContent,
  vod,
}: ActiveMapTabProps) {
  switch (activeTab) {
    case "killfeed":
      return (
        <Killfeed id={id} team1Color={team1Color} team2Color={team2Color} />
      );
    case "charts":
      return (
        <MapCharts
          id={id}
          team1Color={team1Color}
          team2Color={team2Color}
          tempoChartEnabled={tempoChartEnabled}
        />
      );
    case "story":
      // The trigger is only shown when a story exists, but guard defensively.
      return matchStory !== null ? (
        <MatchStoryTab
          result={matchStory}
          team1Color={team1Color}
          team2Color={team2Color}
        />
      ) : null;
    case "heatmap":
      return <HeatmapTab id={mapDataId} />;
    case "replay":
      return <ReplayTab id={mapDataId} />;
    case "routes":
      return <RoutesTab id={mapDataId} />;
    case "events":
      return (
        <MapEvents
          id={id}
          team1Color={team1Color}
          team2Color={team2Color}
          includePositional={positionalDataEnabled}
        />
      );
    case "initiation": {
      // Only computed when the initiation tab is open — it is one of the
      // heavier reads and is rarely the landing tab.
      const fightInitiation = await getFightInitiationForMapData(
        mapDataId
      ).catch(
        () =>
          ({
            available: false,
            labels: [],
            summary: null,
            rounds: [],
          }) satisfies MapInitiationResult
      );
      return <FightInitiationInspector result={fightInitiation} />;
    }
    case "compare":
      return <ComparePlayers id={id} />;
    case "notes":
      return (
        <TipTap
          noteContent={noteContent}
          mapDataId={mapDataId}
          scrimId={scrimId}
        />
      );
    case "vods":
      return <VodOverview vod={vod} mapId={id} />;
    case "overview":
    default:
      return (
        <DefaultOverview
          id={id}
          team1Color={team1Color}
          team2Color={team2Color}
        />
      );
  }
}
