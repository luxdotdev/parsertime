"use client";

import { HeroCompPicker } from "@/components/data-labeling/hero-comp-picker";
import { PlayerAssignmentPanel } from "@/components/data-labeling/player-assignment-panel";
import { autoSuggestAssignments } from "@/components/data-labeling/roster-role-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  MatchForLabeling,
  MatchMapForLabeling,
} from "@/data/data-labeling-dto";
import { toHero } from "@/lib/utils";
import { heroRoleMapping, type HeroName } from "@/types/heroes";
import { YouTubeEmbed } from "@next/third-parties/google";
import { ArrowLeft, Check, Loader2, RotateCcw } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type MatchLabelingViewProps = {
  match: MatchForLabeling;
};

type MapCompState = {
  team1Comp: string[];
  team2Comp: string[];
  team1Assignments: Record<string, string>;
  team2Assignments: Record<string, string>;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
};

function validateRoleConstraint(heroes: string[]): boolean {
  if (heroes.length !== 5) return false;
  let tanks = 0;
  let damage = 0;
  let support = 0;
  for (const hero of heroes) {
    const role = heroRoleMapping[hero as HeroName];
    if (role === "Tank") tanks++;
    else if (role === "Damage") damage++;
    else if (role === "Support") support++;
  }
  return tanks === 1 && damage === 2 && support === 2;
}

function extractYouTubeId(url: string): string {
  if (url.startsWith("https://youtu.be/"))
    return url.split("youtu.be/")[1].split("?")[0];
  if (url.includes("/embed/"))
    return url.split("/embed/")[1].split("?")[0];
  if (url.includes("/live/"))
    return url.split("/live/")[1].split("?")[0];
  return url.split("v=")[1]?.split("&")[0] || "";
}

function extractStartTime(url: string): number {
  const match = url.match(/[?&]t=(\d+)/);
  return match ? Number(match[1]) : 0;
}

function getVodSource(url: string) {
  if (
    url.startsWith("https://www.youtube.com/") ||
    url.startsWith("https://youtu.be/") ||
    url.startsWith("https://youtube.com/")
  )
    return "youtube";
  if (url.startsWith("https://www.twitch.tv/videos/")) return "twitch";
  return null;
}

export function MatchLabelingView({ match }: MatchLabelingViewProps) {
  const t = useTranslations("dataLabeling.labeling");
  const [activeMap, setActiveMap] = useState(
    match.maps[0]?.id.toString() ?? ""
  );

  const [mapStates, setMapStates] = useState<Record<number, MapCompState>>(
    () => {
      const states: Record<number, MapCompState> = {};
      for (const map of match.maps) {
        const team1Existing: Record<string, string> = {};
        const team2Existing: Record<string, string> = {};
        for (const a of map.heroAssignments) {
          if (a.team === "team1") team1Existing[a.heroName] = a.playerName;
          else team2Existing[a.heroName] = a.playerName;
        }

        states[map.id] = {
          team1Comp: map.team1Comp,
          team2Comp: map.team2Comp,
          team1Assignments: Object.keys(team1Existing).length > 0
            ? team1Existing
            : autoSuggestAssignments(map.team1Comp, match.team1Roster, {}),
          team2Assignments: Object.keys(team2Existing).length > 0
            ? team2Existing
            : autoSuggestAssignments(map.team2Comp, match.team2Roster, {}),
          dirty: false,
          saving: false,
          saved: map.team1Comp.length > 0 && map.team2Comp.length > 0,
        };
      }
      return states;
    }
  );

  const updateMapComp = useCallback(
    (mapId: number, team: "team1Comp" | "team2Comp", heroes: string[]) => {
      setMapStates((prev) => {
        const prevState = prev[mapId];
        const assignmentKey =
          team === "team1Comp" ? "team1Assignments" : "team2Assignments";
        const roster =
          team === "team1Comp" ? match.team1Roster : match.team2Roster;

        const existingAssignments = prevState[assignmentKey];
        const pruned: Record<string, string> = {};
        for (const hero of heroes) {
          if (existingAssignments[hero]) {
            pruned[hero] = existingAssignments[hero];
          }
        }
        const updatedAssignments = autoSuggestAssignments(
          heroes,
          roster,
          pruned
        );

        return {
          ...prev,
          [mapId]: {
            ...prevState,
            [team]: heroes,
            [assignmentKey]: updatedAssignments,
            dirty: true,
            saved: false,
          },
        };
      });
    },
    [match.team1Roster, match.team2Roster]
  );

  const updateAssignments = useCallback(
    (
      mapId: number,
      team: "team1Assignments" | "team2Assignments",
      assignments: Record<string, string>
    ) => {
      setMapStates((prev) => ({
        ...prev,
        [mapId]: {
          ...prev[mapId],
          [team]: assignments,
          dirty: true,
          saved: false,
        },
      }));
    },
    []
  );

  const saveMapComp = useCallback(
    async (mapId: number) => {
      const state = mapStates[mapId];
      if (!state) return;

      if (
        !validateRoleConstraint(state.team1Comp) ||
        !validateRoleConstraint(state.team2Comp)
      ) {
        toast.error(t("roleConstraint"));
        return;
      }

      setMapStates((prev) => ({
        ...prev,
        [mapId]: { ...prev[mapId], saving: true },
      }));

      try {
        const heroAssignments = [
          ...Object.entries(state.team1Assignments).map(
            ([heroName, playerName]) => ({
              team: "team1" as const,
              heroName,
              playerName,
            })
          ),
          ...Object.entries(state.team2Assignments).map(
            ([heroName, playerName]) => ({
              team: "team2" as const,
              heroName,
              playerName,
            })
          ),
        ];

        const res = await fetch("/api/data-labeling/save-comp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mapResultId: mapId,
            team1Comp: state.team1Comp,
            team2Comp: state.team2Comp,
            heroAssignments:
              heroAssignments.length > 0 ? heroAssignments : undefined,
          }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Save failed");
        }

        setMapStates((prev) => ({
          ...prev,
          [mapId]: { ...prev[mapId], saving: false, dirty: false, saved: true },
        }));
        toast.success(t("saveSuccess"));
      } catch (err) {
        setMapStates((prev) => ({
          ...prev,
          [mapId]: { ...prev[mapId], saving: false },
        }));
        toast.error(
          err instanceof Error ? err.message : t("saveError")
        );
      }
    },
    [mapStates, t]
  );

  const resetMap = useCallback(
    (mapId: number) => {
      setMapStates((prev) => ({
        ...prev,
        [mapId]: {
          ...prev[mapId],
          team1Comp: [],
          team2Comp: [],
          team1Assignments: {},
          team2Assignments: {},
          dirty: false,
          saved: false,
        },
      }));
    },
    []
  );

  const vod = match.vods[0];
  const vodSource = vod ? getVodSource(vod.url) : null;
  const parentDomain = process.env.NEXT_PUBLIC_VERCEL_URL
    ? process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, "").split(
        "/"
      )[0]
    : "localhost";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={"/data-labeling" as Route}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {match.team1FullName} vs {match.team2FullName}
          </h1>
          <Badge variant="outline" className="tabular-nums">
            {match.team1Score ?? "?"} &ndash; {match.team2Score ?? "?"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {vod && vodSource === "youtube" && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video">
                  <YouTubeEmbed
                    videoid={extractYouTubeId(vod.url)}
                    params={`controls=1&start=${extractStartTime(vod.url)}`}
                    style="width:100%; height:100%; max-width:100%; max-height:100%; border:0;"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {vod && vodSource === "twitch" && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video">
                  <iframe
                    src={`https://player.twitch.tv/?video=${vod.url.split("/videos/")[1].split("?")[0]}&parent=${parentDomain}`}
                    title="Twitch VOD"
                    className="h-full w-full border-0"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {(!vod || !vodSource) && (
            <Card>
              <CardContent className="flex aspect-video items-center justify-center">
                <span className="text-muted-foreground">No VOD available</span>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("instructions.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{t("instructions.body")}</p>
              <p>{t("instructions.swapNote")}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Tabs value={activeMap} onValueChange={setActiveMap}>
            <TabsList className="w-full">
              {match.maps.map((map) => {
                const state = mapStates[map.id];
                const isLabeled = state?.saved;
                return (
                  <TabsTrigger
                    key={map.id}
                    value={map.id.toString()}
                    className="relative flex-1"
                  >
                    {t("map", { number: map.gameNumber })}
                    {isLabeled && (
                      <Check className="ml-1 inline h-3 w-3 text-green-500" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {match.maps.map((map) => (
              <TabsContent
                key={map.id}
                value={map.id.toString()}
                className="space-y-4"
              >
                <MapLabelingPanel
                  map={map}
                  match={match}
                  state={mapStates[map.id]}
                  onTeam1Change={(heroes) =>
                    updateMapComp(map.id, "team1Comp", heroes)
                  }
                  onTeam2Change={(heroes) =>
                    updateMapComp(map.id, "team2Comp", heroes)
                  }
                  onTeam1AssignmentsChange={(assignments) =>
                    updateAssignments(map.id, "team1Assignments", assignments)
                  }
                  onTeam2AssignmentsChange={(assignments) =>
                    updateAssignments(map.id, "team2Assignments", assignments)
                  }
                  onSave={() => saveMapComp(map.id)}
                  onReset={() => resetMap(map.id)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

type MapLabelingPanelProps = {
  map: MatchMapForLabeling;
  match: MatchForLabeling;
  state: MapCompState;
  onTeam1Change: (heroes: string[]) => void;
  onTeam2Change: (heroes: string[]) => void;
  onTeam1AssignmentsChange: (assignments: Record<string, string>) => void;
  onTeam2AssignmentsChange: (assignments: Record<string, string>) => void;
  onSave: () => void;
  onReset: () => void;
};

function MapLabelingPanel({
  map,
  match,
  state,
  onTeam1Change,
  onTeam2Change,
  onTeam1AssignmentsChange,
  onTeam2AssignmentsChange,
  onSave,
  onReset,
}: MapLabelingPanelProps) {
  const t = useTranslations("dataLabeling.labeling");

  const allBans = map.heroBans.map((b) => b.hero);

  const canSave =
    validateRoleConstraint(state.team1Comp) &&
    validateRoleConstraint(state.team2Comp) &&
    state.dirty &&
    !state.saving;

  const canReset =
    (state.team1Comp.length > 0 || state.team2Comp.length > 0) &&
    !state.saving;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>
              {map.mapName} ({map.mapType})
            </span>
            <Badge
              variant={state.saved ? "default" : "secondary"}
              className="text-xs"
            >
              {state.saved ? t("labeled") : t("unlabeled")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="text-muted-foreground tabular-nums">
            {match.team1} {map.team1Score} &ndash; {map.team2Score}{" "}
            {match.team2}
          </div>

          {map.heroBans.length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium">
                {t("heroBans")}
              </div>
              <div className="flex flex-wrap gap-1">
                {map.heroBans.map((ban) => (
                  <div
                    key={ban.id}
                    className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs"
                  >
                    <Image
                      src={`/heroes/${toHero(ban.hero)}.png`}
                      alt={ban.hero}
                      width={16}
                      height={16}
                      className="rounded-sm"
                    />
                    <span>{ban.hero}</span>
                    <span className="text-muted-foreground">
                      ({ban.team === "team1" ? match.team1 : match.team2})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <HeroCompPicker
        teamLabel={match.team1}
        selectedHeroes={state.team1Comp}
        onSelectionChange={onTeam1Change}
        bannedHeroes={allBans}
        assignments={state.team1Assignments}
      />

      {match.team1Roster.length > 0 && (
        <PlayerAssignmentPanel
          teamLabel={match.team1}
          selectedHeroes={state.team1Comp}
          roster={match.team1Roster}
          assignments={state.team1Assignments}
          onAssignmentsChange={onTeam1AssignmentsChange}
        />
      )}

      <HeroCompPicker
        teamLabel={match.team2}
        selectedHeroes={state.team2Comp}
        onSelectionChange={onTeam2Change}
        bannedHeroes={allBans}
        assignments={state.team2Assignments}
      />

      {match.team2Roster.length > 0 && (
        <PlayerAssignmentPanel
          teamLabel={match.team2}
          selectedHeroes={state.team2Comp}
          roster={match.team2Roster}
          assignments={state.team2Assignments}
          onAssignmentsChange={onTeam2AssignmentsChange}
        />
      )}

      <Button
        onClick={onSave}
        disabled={!canSave}
        className="w-full"
      >
        {state.saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("saving")}
          </>
        ) : state.saved && !state.dirty ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            {t("saved")}
          </>
        ) : (
          t("save")
        )}
      </Button>

      <Button
        variant="outline"
        onClick={onReset}
        disabled={!canReset}
        className="w-full"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        {t("reset")}
      </Button>
    </div>
  );
}
