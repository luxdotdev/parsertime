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
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { useReplayTimeParam } from "@/components/map/map-tabs";
import { createReplayStore } from "@/stores/replay-store";
import { useSelector } from "@xstate/store/react";
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
};

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
}: ReplayViewerProps) {
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
          No map calibration available for this time range.
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
      aria-label="Replay viewer"
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
