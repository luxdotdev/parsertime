import type {
  DisplayEvent,
  KillDisplayEvent,
  PositionSample,
} from "@/data/replay-dto";

export type PlayerTimeline = {
  playerName: string;
  playerTeam: string;
  samples: { t: number; x: number; z: number }[];
  heroChanges: { t: number; hero: string }[];
};

export type DeathWindow = {
  deathTime: number;
  respawnTime: number;
};

export type PlayerState = {
  x: number;
  z: number;
  hero: string;
  isDead: boolean;
  isUlting: boolean;
  hasUltimate: boolean;
};

function bisectRight<T>(
  arr: T[],
  target: number,
  key: (item: T) => number
): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (key(arr[mid]) <= target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo - 1;
}

type PlayerKey = string;

function toKey(name: string, team: string): PlayerKey {
  return `${name}::${team}`;
}

export function buildPlayerTimelines(
  positionSamples: PositionSample[],
  displayEvents: DisplayEvent[]
): Map<PlayerKey, PlayerTimeline> {
  const timelines = new Map<PlayerKey, PlayerTimeline>();

  function getTimeline(name: string, team: string): PlayerTimeline {
    const key = toKey(name, team);
    let tl = timelines.get(key);
    if (!tl) {
      tl = { playerName: name, playerTeam: team, samples: [], heroChanges: [] };
      timelines.set(key, tl);
    }
    return tl;
  }

  for (const s of positionSamples) {
    const tl = getTimeline(s.playerName, s.playerTeam);
    tl.samples.push({ t: s.t, x: s.x, z: s.z });

    if (
      tl.heroChanges.length === 0 ||
      tl.heroChanges[tl.heroChanges.length - 1].hero !== s.hero
    ) {
      tl.heroChanges.push({ t: s.t, hero: s.hero });
    }
  }

  for (const e of displayEvents) {
    if (e.type === "hero_swap") {
      const tl = getTimeline(e.playerName, e.playerTeam);
      tl.heroChanges.push({ t: e.t, hero: e.playerHero });
    }
  }

  for (const tl of timelines.values()) {
    tl.heroChanges.sort((a, b) => a.t - b.t);
  }

  return timelines;
}

export function buildDeathWindows(
  displayEvents: DisplayEvent[],
  timelines: Map<PlayerKey, PlayerTimeline>
): Map<PlayerKey, DeathWindow[]> {
  const deaths = new Map<PlayerKey, DeathWindow[]>();

  const kills = displayEvents.filter(
    (e): e is KillDisplayEvent => e.type === "kill"
  );

  for (const k of kills) {
    const key = toKey(k.victimName, k.victimTeam);
    const windows = deaths.get(key) ?? [];

    const tl = timelines.get(key);
    let respawnTime = k.t + 10;

    if (tl) {
      const idx = bisectRight(tl.samples, k.t, (s) => s.t);
      if (idx + 1 < tl.samples.length) {
        const nextSampleTime = tl.samples[idx + 1].t;
        if (nextSampleTime > k.t && nextSampleTime < k.t + 15) {
          respawnTime = nextSampleTime;
        }
      }
    }

    windows.push({ deathTime: k.t, respawnTime });
    deaths.set(key, windows);
  }

  return deaths;
}

type UltWindow = { start: number; end: number };

export function buildUltWindows(
  displayEvents: DisplayEvent[]
): Map<PlayerKey, UltWindow[]> {
  const windows = new Map<PlayerKey, UltWindow[]>();
  const openUlts = new Map<number, { key: PlayerKey; start: number }>();

  for (const e of displayEvents) {
    if (e.type === "ult_start") {
      const key = toKey(e.playerName, e.playerTeam);
      openUlts.set(e.ultimateId, { key, start: e.t });
    } else if (e.type === "ult_end") {
      const open = openUlts.get(e.ultimateId);
      if (open) {
        const arr = windows.get(open.key) ?? [];
        arr.push({ start: open.start, end: e.t });
        windows.set(open.key, arr);
        openUlts.delete(e.ultimateId);
      }
    }
  }

  return windows;
}

type UltChargeChange = { t: number; charged: boolean };

export function buildUltChargeTimeline(
  displayEvents: DisplayEvent[]
): Map<PlayerKey, UltChargeChange[]> {
  const timelines = new Map<PlayerKey, UltChargeChange[]>();

  for (const e of displayEvents) {
    if (e.type === "ult_charged") {
      const key = toKey(e.playerName, e.playerTeam);
      const arr = timelines.get(key) ?? [];
      arr.push({ t: e.t, charged: true });
      timelines.set(key, arr);
    } else if (e.type === "ult_start") {
      const key = toKey(e.playerName, e.playerTeam);
      const arr = timelines.get(key) ?? [];
      arr.push({ t: e.t, charged: false });
      timelines.set(key, arr);
    }
  }

  for (const arr of timelines.values()) {
    arr.sort((a, b) => a.t - b.t);
  }

  return timelines;
}

export const DEFAULT_STALE_THRESHOLD = 5;

export function getPlayerStateAtTime(
  timeline: PlayerTimeline,
  t: number,
  deathWindows: DeathWindow[],
  ultWindows: UltWindow[],
  ultChargeChanges: UltChargeChange[],
  staleThreshold: number = DEFAULT_STALE_THRESHOLD
): PlayerState | null {
  const posIdx = bisectRight(timeline.samples, t, (s) => s.t);
  if (posIdx < 0) return null;

  const sample = timeline.samples[posIdx];
  if (t - sample.t > staleThreshold) return null;

  const heroIdx = bisectRight(timeline.heroChanges, t, (h) => h.t);
  const hero =
    heroIdx >= 0
      ? timeline.heroChanges[heroIdx].hero
      : (timeline.heroChanges[0]?.hero ?? "Unknown");

  const isDead = deathWindows.some(
    (w) => t >= w.deathTime && t < w.respawnTime
  );
  const isUlting = ultWindows.some((w) => t >= w.start && t <= w.end);

  const chargeIdx = bisectRight(ultChargeChanges, t, (c) => c.t);
  const hasUltimate = chargeIdx >= 0 && ultChargeChanges[chargeIdx].charged;

  return {
    x: sample.x,
    z: sample.z,
    hero,
    isDead,
    isUlting,
    hasUltimate,
  };
}

export { toKey };
