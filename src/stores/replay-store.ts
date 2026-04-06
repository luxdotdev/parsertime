import { createStore } from "@xstate/store";

type ReplayContext = {
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  minTime: number;
  maxTime: number;
  selectedPlayer: string | null;
};

export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

export function createReplayStore(minTime: number, maxTime: number) {
  return createStore({
    context: {
      currentTime: minTime,
      isPlaying: false,
      playbackSpeed: 1,
      minTime,
      maxTime,
      selectedPlayer: null,
    } satisfies ReplayContext,
    on: {
      play: (ctx: ReplayContext): ReplayContext => {
        const atEnd = ctx.currentTime >= ctx.maxTime;
        return {
          ...ctx,
          isPlaying: true,
          currentTime: atEnd ? ctx.minTime : ctx.currentTime,
        };
      },

      pause: (ctx: ReplayContext): ReplayContext => ({
        ...ctx,
        isPlaying: false,
      }),

      togglePlayback: (ctx: ReplayContext): ReplayContext => {
        if (ctx.isPlaying) {
          return { ...ctx, isPlaying: false };
        }
        // If at end, restart from beginning
        const atEnd = ctx.currentTime >= ctx.maxTime;
        return {
          ...ctx,
          isPlaying: true,
          currentTime: atEnd ? ctx.minTime : ctx.currentTime,
        };
      },

      seek: (ctx: ReplayContext, event: { time: number }): ReplayContext => ({
        ...ctx,
        currentTime: Math.max(ctx.minTime, Math.min(ctx.maxTime, event.time)),
      }),

      setSpeed: (
        ctx: ReplayContext,
        event: { speed: number }
      ): ReplayContext => ({
        ...ctx,
        playbackSpeed: event.speed,
      }),

      tick: (ctx: ReplayContext, event: { delta: number }): ReplayContext => {
        const newTime = ctx.currentTime + event.delta * ctx.playbackSpeed;
        if (newTime >= ctx.maxTime) {
          return { ...ctx, currentTime: ctx.maxTime, isPlaying: false };
        }
        return { ...ctx, currentTime: newTime };
      },

      selectPlayer: (
        ctx: ReplayContext,
        event: { key: string | null }
      ): ReplayContext => ({
        ...ctx,
        selectedPlayer: ctx.selectedPlayer === event.key ? null : event.key,
      }),
    },
  });
}

export type ReplayStore = ReturnType<typeof createReplayStore>;
