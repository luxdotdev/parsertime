"use client";

import type {
  DisplayEvent,
  PositionSample,
  ReplayCalibration,
} from "@/data/map/replay/types";
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import { getControlSubMapName } from "@/lib/map-calibration/control-map-index";
import {
  buildDeathWindows,
  buildPlayerTimelines,
  buildUltChargeTimeline,
  buildUltWindows,
  getPlayerStateAtTime,
  toKey,
  type DeathWindow,
} from "@/lib/replay/build-player-timeline";
import {
  computeAnchor,
  computeGhostOffset,
  ghostRoundWindow,
  ghostTimeAt,
  isGhostVisible,
  type GhostAlignMode,
} from "@/lib/replay/ghost-alignment";
import { GhostControls } from "./ghost-controls";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { useReplayTimeParam } from "@/components/map/map-tabs";
import { createReplayStore } from "@/stores/replay-store";
import { useSelector } from "@xstate/store/react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Separator } from "@/components/ui/separator";
import { ReplayMap } from "./replay-map";
import { ReplayTimeline } from "./replay-timeline";
import { ReplayEventFeed } from "./replay-event-feed";
import { ReplayPlayerList } from "./replay-player-list";

type ReplayViewerProps = {
  positionSamples: PositionSample[];
  displayEvents: DisplayEvent[];
  calibration: ReplayCalibration;
  team1Name: string;
  team2Name: string;
  ghostCandidates?: {
    mapDataId: number;
    scrimName: string;
    scrimDate: string;
  }[];
};

type GhostSourceData = {
  positionSamples: PositionSample[];
  displayEvents: DisplayEvent[];
  label: string;
};

type GhostConfig = {
  source:
    | { kind: "round"; roundNumber: number }
    | { kind: "external"; mapDataId: number; roundNumber: number };
  primaryRoundNumber: number;
  alignMode: GhostAlignMode;
  nudgeSec: number;
  playerFilter: string | null;
};

type GhostFetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: GhostSourceData }
  | { status: "error"; kind: "noData" | "loadError" };

function roundNumbersFrom(displayEvents: DisplayEvent[]): number[] {
  const nums = new Set<number>();
  for (const e of displayEvents) {
    if (e.type === "round_start") nums.add(e.roundNumber);
  }
  return [...nums].sort((a, b) => a - b);
}

function roundObjectiveIndex(
  displayEvents: DisplayEvent[],
  roundNumber: number
): number {
  for (const e of displayEvents) {
    if (e.type === "round_start" && e.roundNumber === roundNumber) {
      return e.objectiveIndex;
    }
  }
  return 0;
}

function primaryObjectiveIndexAt(
  calibration: ReplayCalibration,
  currentTime: number
): number | null {
  if (calibration.mapType !== "Control") return null;
  if (calibration.roundStarts.length === 0) return null;
  let objectiveIndex = 0;
  for (let i = calibration.roundStarts.length - 1; i >= 0; i--) {
    if (currentTime >= calibration.roundStarts[i].matchTime) {
      objectiveIndex = calibration.roundStarts[i].objectiveIndex;
      break;
    }
  }
  return objectiveIndex;
}

function getCalibrationAtTime(
  calibration: ReplayCalibration,
  currentTime: number
): LoadedCalibration | null {
  if (calibration.mapType === "Control" && calibration.roundStarts.length > 0) {
    let objectiveIndex = 0;
    for (let i = calibration.roundStarts.length - 1; i >= 0; i--) {
      if (currentTime >= calibration.roundStarts[i].matchTime) {
        objectiveIndex = calibration.roundStarts[i].objectiveIndex;
        break;
      }
    }
    const subMapName = getControlSubMapName(
      calibration.mapName,
      objectiveIndex
    );
    if (subMapName && calibration.calibrations[subMapName]) {
      return calibration.calibrations[subMapName];
    }
    const keys = Object.keys(calibration.calibrations);
    return keys.length > 0 ? calibration.calibrations[keys[0]] : null;
  }

  const cal = calibration.calibrations[calibration.mapName];
  return cal ?? null;
}

const KILL_LINE_DURATION = 2;

type KillLine = {
  attackerX: number;
  attackerZ: number;
  victimX: number;
  victimZ: number;
  attackerTeam: string;
};

function findRecentKill(
  displayEvents: DisplayEvent[],
  currentTime: number,
  timelines: Map<
    string,
    {
      samples: { t: number; x: number; z: number }[];
      heroChanges: { t: number; hero: string }[];
      playerName: string;
      playerTeam: string;
    }
  >
): KillLine | null {
  for (let i = displayEvents.length - 1; i >= 0; i--) {
    const e = displayEvents[i];
    if (e.type !== "kill") continue;
    if (e.t > currentTime) continue;
    if (currentTime - e.t >= KILL_LINE_DURATION) break;

    const attackerTl = timelines.get(toKey(e.attackerName, e.attackerTeam));
    const victimTl = timelines.get(toKey(e.victimName, e.victimTeam));
    if (!attackerTl || !victimTl) break;

    const aState = getPlayerStateAtTime(attackerTl, e.t, [], [], []);
    const vState = getPlayerStateAtTime(victimTl, e.t, [], [], []);
    if (!aState || !vState) break;

    return {
      attackerX: aState.x,
      attackerZ: aState.z,
      victimX: vState.x,
      victimZ: vState.z,
      attackerTeam: e.attackerTeam,
    };
  }
  return null;
}

export function ReplayViewer({
  positionSamples,
  displayEvents,
  calibration,
  team1Name,
  team2Name,
  ghostCandidates = [],
}: ReplayViewerProps) {
  const t = useTranslations("mapPage.replay");
  const tGhost = useTranslations("mapPage.replay.ghost");
  const { team1: team1Color, team2: team2Color } = useColorblindMode();

  const minTime = positionSamples.length > 0 ? positionSamples[0].t : 0;
  const maxTime =
    positionSamples.length > 0
      ? positionSamples[positionSamples.length - 1].t
      : 0;

  const [replayTime, setReplayTime] = useReplayTimeParam();
  const [store] = useState(() => createReplayStore(minTime, maxTime));

  useEffect(() => {
    if (replayTime != null) {
      store.send({ type: "seek", time: replayTime });
      store.send({ type: "pause" });
      void setReplayTime(null);
    }
  }, [replayTime, store, setReplayTime]);

  useEffect(() => {
    for (const cal of Object.values(calibration.calibrations)) {
      const img = new globalThis.Image();
      img.crossOrigin = "anonymous";
      img.src = cal.imagePresignedUrl;
    }
  }, [calibration.calibrations]);

  const timelines = useMemo(
    () => buildPlayerTimelines(positionSamples, displayEvents),
    [positionSamples, displayEvents]
  );

  const deathWindows = useMemo(
    () => buildDeathWindows(displayEvents, timelines),
    [displayEvents, timelines]
  );

  const ultWindows = useMemo(
    () => buildUltWindows(displayEvents),
    [displayEvents]
  );

  const ultChargeTimeline = useMemo(
    () => buildUltChargeTimeline(displayEvents),
    [displayEvents]
  );

  const currentTime = useSelector(store, (s) => s.context.currentTime);
  const isPlaying = useSelector(store, (s) => s.context.isPlaying);
  const selectedPlayer = useSelector(store, (s) => s.context.selectedPlayer);

  const lastFrameRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastFrameRef.current = performance.now();

    function loop(now: number) {
      const delta = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;
      store.send({ type: "tick", delta });
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, store]);

  const playerStates = useMemo(() => {
    const states: {
      key: string;
      playerName: string;
      playerTeam: string;
      state: NonNullable<ReturnType<typeof getPlayerStateAtTime>>;
      isInactive: boolean;
    }[] = [];

    for (const [key, timeline] of timelines) {
      const deaths: DeathWindow[] = deathWindows.get(key) ?? [];
      const ults = ultWindows.get(key) ?? [];
      const charges = ultChargeTimeline.get(key) ?? [];
      const state = getPlayerStateAtTime(
        timeline,
        currentTime,
        deaths,
        ults,
        charges
      );
      if (state) {
        states.push({
          key,
          playerName: timeline.playerName,
          playerTeam: timeline.playerTeam,
          state,
          isInactive: false,
        });
        continue;
      }

      const staleState = getPlayerStateAtTime(
        timeline,
        currentTime,
        deaths,
        ults,
        charges,
        Number.POSITIVE_INFINITY
      );
      if (staleState) {
        states.push({
          key,
          playerName: timeline.playerName,
          playerTeam: timeline.playerTeam,
          state: staleState,
          isInactive: true,
        });
      }
    }

    return states;
  }, [timelines, deathWindows, ultWindows, ultChargeTimeline, currentTime]);

  const recentKill = findRecentKill(displayEvents, currentTime, timelines);

  const currentCalibration = useMemo(
    () => getCalibrationAtTime(calibration, currentTime),
    [calibration, currentTime]
  );

  // ----- Ghost overlay state (plain React; xstate store untouched) -----
  const primaryRounds = useMemo(
    () => roundNumbersFrom(displayEvents),
    [displayEvents]
  );

  const [ghostConfig, setGhostConfig] = useState<GhostConfig | null>(null);
  const [externalFetch, setExternalFetch] = useState<GhostFetchState>({
    status: "idle",
  });
  // The mapDataId the externalFetch corresponds to, to detect stale fetches.
  const fetchedMapDataIdRef = useRef<number | null>(null);

  // Fetch external ghost payload when an external source is selected.
  useEffect(() => {
    if (ghostConfig?.source.kind !== "external") {
      fetchedMapDataIdRef.current = null;
      return;
    }
    const { mapDataId } = ghostConfig.source;
    if (fetchedMapDataIdRef.current === mapDataId) return;

    fetchedMapDataIdRef.current = mapDataId;
    let cancelled = false;
    setExternalFetch({ status: "loading" });

    void (async () => {
      try {
        const res = await fetch(`/api/replay/ghost?mapDataId=${mapDataId}`);
        if (cancelled) return;
        if (res.status === 422) {
          setExternalFetch({ status: "error", kind: "noData" });
          return;
        }
        if (!res.ok) {
          setExternalFetch({ status: "error", kind: "loadError" });
          return;
        }
        const json = (await res.json()) as {
          positionSamples: PositionSample[];
          displayEvents: DisplayEvent[];
        };
        if (cancelled) return;
        setExternalFetch({
          status: "loaded",
          data: {
            positionSamples: json.positionSamples,
            displayEvents: json.displayEvents,
            label: "external",
          },
        });
      } catch {
        if (!cancelled)
          setExternalFetch({ status: "error", kind: "loadError" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ghostConfig]);

  // The ghost source data + round number, resolved from config + fetch state.
  const ghostSource = useMemo((): {
    data: GhostSourceData | null;
    sourceRoundNumber: number;
  } | null => {
    if (!ghostConfig) return null;
    if (ghostConfig.source.kind === "round") {
      return {
        data: { positionSamples, displayEvents, label: "round" },
        sourceRoundNumber: ghostConfig.source.roundNumber,
      };
    }
    if (externalFetch.status === "loaded") {
      return {
        data: externalFetch.data,
        sourceRoundNumber: ghostConfig.source.roundNumber,
      };
    }
    return { data: null, sourceRoundNumber: ghostConfig.source.roundNumber };
  }, [ghostConfig, externalFetch, positionSamples, displayEvents]);

  const ghostEvents = ghostSource?.data?.displayEvents ?? null;
  const ghostSamples = ghostSource?.data?.positionSamples ?? null;
  const ghostRoundsAvailable = useMemo(
    () => (ghostEvents ? roundNumbersFrom(ghostEvents) : []),
    [ghostEvents]
  );

  // Ghost player names (for the filter select), from the ghost dataset.
  const ghostPlayerNames = useMemo(() => {
    if (!ghostSamples) return [];
    const names = new Set<string>();
    for (const s of ghostSamples) names.add(s.playerName);
    return [...names].sort();
  }, [ghostSamples]);

  // Alignment anchors + offset (memoized; recompute on config/source change).
  const primaryAnchor = useMemo(() => {
    if (!ghostConfig) return null;
    return computeAnchor(
      displayEvents,
      ghostConfig.primaryRoundNumber,
      ghostConfig.alignMode
    );
  }, [ghostConfig, displayEvents]);

  const ghostAnchor = useMemo(() => {
    if (!ghostConfig || !ghostEvents || !ghostSource) return null;
    return computeAnchor(
      ghostEvents,
      ghostSource.sourceRoundNumber,
      ghostConfig.alignMode
    );
  }, [ghostConfig, ghostEvents, ghostSource]);

  const ghostOffset = useMemo(() => {
    if (primaryAnchor == null || ghostAnchor == null || !ghostConfig) {
      return null;
    }
    return computeGhostOffset(primaryAnchor, ghostAnchor, ghostConfig.nudgeSec);
  }, [primaryAnchor, ghostAnchor, ghostConfig]);

  // Ghost round window + objective index (Control arena identity).
  const ghostRoundInfo = useMemo(() => {
    if (!ghostEvents || !ghostSamples || !ghostSource) return null;
    const ghostMaxTime =
      ghostSamples.length > 0 ? ghostSamples[ghostSamples.length - 1].t : 0;
    const window = ghostRoundWindow(
      ghostEvents,
      ghostSource.sourceRoundNumber,
      ghostMaxTime
    );
    if (!window) return null;
    return {
      window,
      objectiveIndex: roundObjectiveIndex(
        ghostEvents,
        ghostSource.sourceRoundNumber
      ),
    };
  }, [ghostEvents, ghostSamples, ghostSource]);

  // Ghost player timelines: SAME machinery as primary, over ghost samples
  // (filtered to playerFilter when set). Built once; evaluated per-frame.
  const ghostTimelines = useMemo(() => {
    if (!ghostSamples || !ghostEvents) return null;
    const filter = ghostConfig?.playerFilter ?? null;
    const samples = filter
      ? ghostSamples.filter((s) => s.playerName === filter)
      : ghostSamples;
    return buildPlayerTimelines(samples, ghostEvents);
  }, [ghostSamples, ghostEvents, ghostConfig?.playerFilter]);

  const ghostDeathWindows = useMemo(() => {
    if (!ghostTimelines || !ghostEvents) return null;
    return buildDeathWindows(ghostEvents, ghostTimelines);
  }, [ghostTimelines, ghostEvents]);

  const ghostUltWindows = useMemo(() => {
    if (!ghostEvents) return null;
    return buildUltWindows(ghostEvents);
  }, [ghostEvents]);

  const ghostUltChargeTimeline = useMemo(() => {
    if (!ghostEvents) return null;
    return buildUltChargeTimeline(ghostEvents);
  }, [ghostEvents]);

  // Per-frame ghost evaluation + visibility.
  const ghostRender = useMemo(() => {
    if (
      !ghostConfig ||
      !ghostTimelines ||
      !ghostRoundInfo ||
      ghostOffset == null
    ) {
      return { players: [], arenaMismatch: false };
    }

    const ghostTime = ghostTimeAt(currentTime, ghostOffset);
    const primaryObjIdx = primaryObjectiveIndexAt(calibration, currentTime);

    const inWindow =
      ghostTime >= ghostRoundInfo.window[0] &&
      ghostTime <= ghostRoundInfo.window[1];
    const visible = isGhostVisible(ghostTime, ghostRoundInfo, primaryObjIdx);

    // Hidden specifically due to Control arena mismatch (in-window, but the
    // primary's current sub-map differs from the ghost's round).
    const arenaMismatch =
      inWindow &&
      !visible &&
      primaryObjIdx !== null &&
      ghostRoundInfo.objectiveIndex !== primaryObjIdx;

    if (!visible) return { players: [], arenaMismatch };

    const players: {
      key: string;
      playerName: string;
      playerTeam: string;
      state: NonNullable<ReturnType<typeof getPlayerStateAtTime>>;
      isInactive: boolean;
    }[] = [];

    for (const [key, timeline] of ghostTimelines) {
      const deaths: DeathWindow[] = ghostDeathWindows?.get(key) ?? [];
      const ults = ghostUltWindows?.get(key) ?? [];
      const charges = ghostUltChargeTimeline?.get(key) ?? [];
      const state = getPlayerStateAtTime(
        timeline,
        ghostTime,
        deaths,
        ults,
        charges
      );
      if (state) {
        players.push({
          key,
          playerName: timeline.playerName,
          playerTeam: timeline.playerTeam,
          state,
          isInactive: false,
        });
      }
    }

    return { players, arenaMismatch };
  }, [
    ghostConfig,
    ghostTimelines,
    ghostDeathWindows,
    ghostUltWindows,
    ghostUltChargeTimeline,
    ghostRoundInfo,
    ghostOffset,
    currentTime,
    calibration,
  ]);

  // Inline ghost notice (loading / no-data / load-error / inactive anchors).
  const ghostNotice = useMemo(() => {
    if (!ghostConfig) return null;
    if (ghostConfig.source.kind === "external") {
      if (externalFetch.status === "error") {
        return externalFetch.kind === "noData"
          ? tGhost("noData")
          : tGhost("loadError");
      }
    }
    if (ghostSource?.data && ghostOffset == null) {
      // Source resolved but anchors couldn't be computed.
      return tGhost("noData");
    }
    if (ghostRender.arenaMismatch) return tGhost("arenaMismatch");
    return null;
  }, [
    ghostConfig,
    externalFetch,
    ghostSource,
    ghostOffset,
    ghostRender.arenaMismatch,
    tGhost,
  ]);

  const ghostIsLoading =
    ghostConfig?.source.kind === "external" &&
    externalFetch.status === "loading";

  const handleSelectGhostSource = useCallback(
    (
      value:
        | { kind: "round"; roundNumber: number }
        | { kind: "external"; mapDataId: number }
    ) => {
      setExternalFetch({ status: "idle" });
      setGhostConfig((prev) => {
        const base = {
          primaryRoundNumber: prev?.primaryRoundNumber ?? primaryRounds[0] ?? 1,
          alignMode: prev?.alignMode ?? "ROUND_START",
          nudgeSec: prev?.nudgeSec ?? 0,
          playerFilter: null,
        } satisfies Omit<GhostConfig, "source">;
        if (value.kind === "round") {
          return { ...base, source: value };
        }
        return {
          ...base,
          source: {
            kind: "external",
            mapDataId: value.mapDataId,
            roundNumber: 1,
          },
        };
      });
    },
    [primaryRounds]
  );

  const handleSelectGhostRound = useCallback((roundNumber: number) => {
    setGhostConfig((prev) => {
      if (prev?.source.kind !== "external") return prev;
      return { ...prev, source: { ...prev.source, roundNumber } };
    });
  }, []);

  const handleSelectPrimaryRound = useCallback((roundNumber: number) => {
    setGhostConfig((prev) =>
      prev ? { ...prev, primaryRoundNumber: roundNumber } : prev
    );
  }, []);

  const handleSelectAlignMode = useCallback((mode: GhostAlignMode) => {
    setGhostConfig((prev) => (prev ? { ...prev, alignMode: mode } : prev));
  }, []);

  const handleNudge = useCallback((nudgeSec: number) => {
    setGhostConfig((prev) => (prev ? { ...prev, nudgeSec } : prev));
  }, []);

  const handleSelectPlayerFilter = useCallback((name: string | null) => {
    setGhostConfig((prev) => (prev ? { ...prev, playerFilter: name } : prev));
  }, []);

  const handleClearGhost = useCallback(() => {
    setGhostConfig(null);
    setExternalFetch({ status: "idle" });
    fetchedMapDataIdRef.current = null;
  }, []);

  const ghostSourceValue =
    ghostConfig == null
      ? null
      : ghostConfig.source.kind === "round"
        ? {
            kind: "round" as const,
            roundNumber: ghostConfig.source.roundNumber,
          }
        : {
            kind: "external" as const,
            mapDataId: ghostConfig.source.mapDataId,
          };

  const containerRef = useRef<HTMLDivElement>(null);
  const keyboardHintId = useId();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case " ":
          e.preventDefault();
          store.send({ type: "togglePlayback" });
          break;
        case "ArrowLeft":
          e.preventDefault();
          store.send({
            type: "seek",
            time: currentTime - (e.shiftKey ? 1 : 5),
          });
          break;
        case "ArrowRight":
          e.preventDefault();
          store.send({
            type: "seek",
            time: currentTime + (e.shiftKey ? 1 : 5),
          });
          break;
        case "[": {
          const ctx = store.getSnapshot().context;
          const speeds = [0.25, 0.5, 1, 2, 4];
          const idx = speeds.indexOf(ctx.playbackSpeed);
          if (idx > 0) store.send({ type: "setSpeed", speed: speeds[idx - 1] });
          break;
        }
        case "]": {
          const ctx = store.getSnapshot().context;
          const speeds = [0.25, 0.5, 1, 2, 4];
          const idx = speeds.indexOf(ctx.playbackSpeed);
          if (idx < speeds.length - 1)
            store.send({ type: "setSpeed", speed: speeds[idx + 1] });
          break;
        }
      }
    },
    [store, currentTime]
  );

  const handleSelectPlayer = useCallback(
    (key: string | null) => {
      store.send({ type: "selectPlayer", key });
    },
    [store]
  );

  if (!currentCalibration) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">
          {t("noCalibrationForRange")}
        </p>
      </div>
    );
  }

  const team1Players = playerStates.filter((p) => p.playerTeam === team1Name);
  const team2Players = playerStates.filter((p) => p.playerTeam !== team1Name);

  return (
    <div
      ref={containerRef}
      className="space-y-4 outline-none"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus required for keyboard playback controls
      tabIndex={0}
      role="application"
      aria-label={t("viewerLabel")}
      aria-keyshortcuts="Space ArrowLeft ArrowRight"
      aria-describedby={keyboardHintId}
      onKeyDown={handleKeyDown}
    >
      <ReplayPlayerList
        team1Players={team1Players}
        team2Players={team2Players}
        team1Name={team1Name}
        team2Name={team2Name}
        team1Color={team1Color}
        team2Color={team2Color}
        selectedPlayer={selectedPlayer}
        onSelectPlayer={handleSelectPlayer}
      />

      <Separator />

      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <ReplayMap
            players={playerStates}
            calibration={currentCalibration}
            team1Name={team1Name}
            team1Color={team1Color}
            team2Color={team2Color}
            selectedPlayer={selectedPlayer}
            onSelectPlayerAction={handleSelectPlayer}
            recentKill={recentKill}
            ghost={ghostConfig ? { players: ghostRender.players } : undefined}
          />
        </div>
        <div className="hidden w-72 shrink-0 lg:block">
          <ReplayEventFeed
            displayEvents={displayEvents}
            currentTime={currentTime}
            team1Name={team1Name}
            team1Color={team1Color}
            team2Color={team2Color}
          />
        </div>
      </div>

      <Separator />

      <GhostControls
        primaryRounds={primaryRounds}
        ghostCandidates={ghostCandidates}
        active={ghostConfig != null}
        sourceValue={ghostSourceValue}
        onSelectSourceAction={handleSelectGhostSource}
        ghostRounds={ghostRoundsAvailable}
        ghostRoundNumber={
          ghostConfig?.source.kind === "external"
            ? ghostConfig.source.roundNumber
            : 1
        }
        onSelectGhostRoundAction={handleSelectGhostRound}
        showGhostRoundSelect={ghostConfig?.source.kind === "external"}
        primaryRoundNumber={
          ghostConfig?.primaryRoundNumber ?? primaryRounds[0] ?? 1
        }
        onSelectPrimaryRoundAction={handleSelectPrimaryRound}
        alignMode={ghostConfig?.alignMode ?? "ROUND_START"}
        onSelectAlignModeAction={handleSelectAlignMode}
        nudgeSec={ghostConfig?.nudgeSec ?? 0}
        onNudgeAction={handleNudge}
        playerNames={ghostPlayerNames}
        playerFilter={ghostConfig?.playerFilter ?? null}
        onSelectPlayerFilterAction={handleSelectPlayerFilter}
        onClearAction={handleClearGhost}
        isLoading={ghostIsLoading}
        notice={ghostNotice}
      />

      <Separator />

      <ReplayTimeline
        store={store}
        displayEvents={displayEvents}
        team1Name={team1Name}
        team1Color={team1Color}
        team2Color={team2Color}
        keyboardHintId={keyboardHintId}
      />
    </div>
  );
}
