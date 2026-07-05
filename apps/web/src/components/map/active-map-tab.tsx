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
import { getCachedFightInitiation } from "@/data/cached/map-cache";
import type { MatchStoryResult } from "@/data/map/match-story-service";
import type { Locale } from "@/i18n/config";
import type { MapInitiationResult } from "@/lib/fight-initiation";
import prisma from "@/lib/prisma";

type ActiveMapTabProps = {
  /** The tab currently selected via the `?tab=` search param. */
  activeTab: string;
  id: number;
  mapDataId: number;
  scrimId: number;
  /**
   * Viewer locale, threaded in because the tab components are cached
   * ("use cache") and can't read the LOCALE cookie themselves.
   */
  locale: Locale;
  team1Color: string;
  team2Color: string;
  tempoChartEnabled: boolean;
  positionalDataEnabled: boolean;
  coachingCanvasEnabled: boolean;
  matchStory: MatchStoryResult | null;
  vod: string;
};

/**
 * Renders the content for the single active map tab. Only the selected tab's
 * server component is rendered (and only it fetches its data), so the map page
 * no longer pays for every tab's queries on each load. Switching tabs is a
 * shallow:false navigation that re-renders this with a new `activeTab`.
 *
 * The tab components are cached server components — flags and locale come in
 * as props (request APIs are forbidden inside "use cache"), which also lets
 * runtime prefetches resolve a tab's content before the user clicks it. The
 * notes tab is the exception: its content is user-editable, so it reads fresh.
 */
export async function ActiveMapTab({
  activeTab,
  id,
  mapDataId,
  scrimId,
  locale,
  team1Color,
  team2Color,
  tempoChartEnabled,
  positionalDataEnabled,
  coachingCanvasEnabled,
  matchStory,
  vod,
}: ActiveMapTabProps) {
  switch (activeTab) {
    case "killfeed":
      return (
        <Killfeed
          id={id}
          locale={locale}
          team1Color={team1Color}
          team2Color={team2Color}
          positionalDataEnabled={positionalDataEnabled}
          coachingCanvasEnabled={coachingCanvasEnabled}
        />
      );
    case "charts":
      return (
        <MapCharts
          id={id}
          locale={locale}
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
      return <HeatmapTab id={mapDataId} mapId={id} locale={locale} />;
    case "replay":
      return <ReplayTab id={mapDataId} mapId={id} locale={locale} />;
    case "routes":
      return <RoutesTab id={mapDataId} mapId={id} locale={locale} />;
    case "events":
      return (
        <MapEvents
          id={id}
          locale={locale}
          team1Color={team1Color}
          team2Color={team2Color}
          includePositional={positionalDataEnabled}
        />
      );
    case "initiation": {
      // Only computed when the initiation tab is open — it is one of the
      // heavier reads and is rarely the landing tab.
      const fightInitiation = await getCachedFightInitiation(
        id,
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
      return <ComparePlayers id={id} locale={locale} />;
    case "notes": {
      // Notes are user-editable, so this stays an uncached request-time read;
      // the notes tab streams in rather than resolving in a runtime prefetch.
      const note = await prisma.note.findFirst({
        where: { scrimId, MapDataId: mapDataId },
        select: { content: true },
      });
      return (
        <TipTap
          noteContent={note?.content ?? ""}
          mapDataId={mapDataId}
          scrimId={scrimId}
        />
      );
    }
    case "vods":
      return <VodOverview vod={vod} mapId={id} />;
    case "overview":
    default:
      return (
        <DefaultOverview
          id={id}
          locale={locale}
          team1Color={team1Color}
          team2Color={team2Color}
          positionalDataOverride={positionalDataEnabled}
        />
      );
  }
}
