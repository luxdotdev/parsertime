"use client";

import type {
  DisplayEvent,
  KillDisplayEvent,
  RoundDisplayEvent,
} from "@/data/map/replay/types";
import { Slider } from "@/components/ui/slider";
import { PLAYBACK_SPEEDS, type ReplayStore } from "@/stores/replay-store";
import { useSelector } from "@xstate/store/react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useMemo } from "react";

type ReplayTimelineProps = {
  store: ReplayStore;
  displayEvents: DisplayEvent[];
  team1Name: string;
  team1Color: string;
  team2Color: string;
  keyboardHintId?: string;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function ReplayTimeline({
  store,
  displayEvents,
  team1Name,
  team1Color,
  team2Color,
  keyboardHintId,
}: ReplayTimelineProps) {
  const currentTime = useSelector(store, (s) => s.context.currentTime);
  const isPlaying = useSelector(store, (s) => s.context.isPlaying);
  const playbackSpeed = useSelector(store, (s) => s.context.playbackSpeed);
  const minTime = useSelector(store, (s) => s.context.minTime);
  const maxTime = useSelector(store, (s) => s.context.maxTime);

  const duration = maxTime - minTime;

  // Kill markers for timeline
  const killMarkers = useMemo(() => {
    return displayEvents
      .filter((e): e is KillDisplayEvent => e.type === "kill")
      .map((k) => ({
        position: duration > 0 ? ((k.t - minTime) / duration) * 100 : 0,
        color: k.attackerTeam === team1Name ? team1Color : team2Color,
      }));
  }, [displayEvents, minTime, duration, team1Name, team1Color, team2Color]);

  // Round markers
  const roundMarkers = useMemo(() => {
    return displayEvents
      .filter((e): e is RoundDisplayEvent => e.type === "round_start")
      .map((r) => ({
        position: duration > 0 ? ((r.t - minTime) / duration) * 100 : 0,
        label: `R${r.roundNumber}`,
      }));
  }, [displayEvents, minTime, duration]);

  return (
    <div className="bg-card rounded-lg border p-3">
      {/* Timeline scrubber with markers */}
      <div className="relative mb-3">
        {/* Kill tick marks (behind the slider) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6">
          {killMarkers.map((m) => (
            <div
              key={`k-${m.position}-${m.color}`}
              className="absolute top-1 h-4 w-0.5 rounded-full opacity-40"
              style={{
                left: `${m.position}%`,
                backgroundColor: m.color,
              }}
            />
          ))}
          {roundMarkers.map((m) => (
            <div
              key={`r-${m.position}`}
              className="bg-primary/60 absolute top-0 h-6 w-0.5"
              style={{ left: `${m.position}%` }}
            />
          ))}
        </div>

        <Slider
          min={minTime}
          max={maxTime}
          step={0.1}
          value={[currentTime]}
          onValueChange={([v]) => store.send({ type: "seek", time: v })}
          aria-label="Replay scrubber"
          aria-valuetext={formatTime(currentTime)}
          className="relative z-10"
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Skip back */}
        <button
          type="button"
          onClick={() => store.send({ type: "seek", time: currentTime - 5 })}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Skip back 5 seconds"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          onClick={() => store.send({ type: "togglePlayback" })}
          className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:opacity-90"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 pl-0.5" />
          )}
        </button>

        {/* Skip forward */}
        <button
          type="button"
          onClick={() => store.send({ type: "seek", time: currentTime + 5 })}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Skip forward 5 seconds"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        {/* Speed selector */}
        <div
          role="radiogroup"
          aria-label="Playback speed"
          className="flex items-center gap-1"
        >
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              role="radio"
              aria-checked={playbackSpeed === speed}
              onClick={() => store.send({ type: "setSpeed", speed })}
              className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                playbackSpeed === speed
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Time display */}
        <div className="text-muted-foreground ml-auto font-mono text-sm">
          {formatTime(currentTime)} / {formatTime(maxTime)}
        </div>
      </div>

      {/* Keyboard hint */}
      <div
        id={keyboardHintId}
        className="text-muted-foreground mt-2 text-[10px]"
      >
        Space: play/pause · Arrow keys: seek 5s (Shift: 1s) · [ / ]: speed
      </div>
    </div>
  );
}
