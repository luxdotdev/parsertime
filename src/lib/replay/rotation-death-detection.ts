import type { Kill } from "@prisma/client";
import type { Fight } from "@/lib/utils";

export type RotationDeathConfig = {
  earlyFightWindowSec: number;
  maxKillIndex: number;
  preFightWindowSec: number;
  damageCountThreshold: number;
};

const DEFAULT_CONFIG: RotationDeathConfig = {
  earlyFightWindowSec: 3,
  maxKillIndex: 1,
  preFightWindowSec: 5,
  damageCountThreshold: 15,
};

export type DamageEvent = {
  match_time: number;
  attacker_team: string;
  victim_team: string;
};

export type NearbyPlayer = {
  playerName: string;
  playerTeam: string;
  hero: string;
  x: number;
  z: number;
};

export type RotationDeathResult = {
  kill: Kill;
  killIndexInFight: number;
  fightIndex: number;
  isRotationDeath: boolean;
  preFightDamageCount: number;
  killDistance: number | null;
  nearbyPlayers?: NearbyPlayer[];
  signals: {
    isEarlyInFight: boolean;
    lowPreFightDamage: boolean;
  };
};

export type RotationDeathPlayerSummary = {
  playerName: string;
  playerTeam: string;
  rotationDeathCount: number;
  totalDeaths: number;
  rotationDeathRate: number;
};

export type RotationDeathAnalysis = {
  mapDataId: number;
  rotationDeaths: RotationDeathResult[];
  totalKills: number;
  totalFights: number;
  playerSummaries: RotationDeathPlayerSummary[];
};

function isSkippableKill(kill: Kill): boolean {
  if ((kill.event_type as string) === "mercy_rez") return true;
  if (kill.is_environmental === "True" || kill.is_environmental === "1")
    return true;
  if (kill.attacker_name === kill.victim_name) return true;
  return false;
}

function computeKillDistance(kill: Kill): number | null {
  if (
    kill.attacker_x == null ||
    kill.attacker_z == null ||
    kill.victim_x == null ||
    kill.victim_z == null
  )
    return null;

  return Math.sqrt(
    (kill.attacker_x - kill.victim_x) ** 2 +
      (kill.attacker_z - kill.victim_z) ** 2
  );
}

export function countCrossTeamDamage(
  damageEvents: DamageEvent[],
  startTime: number,
  endTime: number
): number {
  let lo = 0;
  let hi = damageEvents.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (damageEvents[mid].match_time < startTime) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  let count = 0;
  for (let i = lo; i < damageEvents.length; i++) {
    const d = damageEvents[i];
    if (d.match_time > endTime) break;
    if (d.attacker_team !== d.victim_team) {
      count++;
    }
  }
  return count;
}

export function detectRotationDeaths(
  fights: Fight[],
  damageEvents: DamageEvent[],
  config?: Partial<RotationDeathConfig>
): RotationDeathResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const results: RotationDeathResult[] = [];

  for (let fightIdx = 0; fightIdx < fights.length; fightIdx++) {
    const fight = fights[fightIdx];
    let realKillIdx = 0;

    for (const kill of fight.kills) {
      if (isSkippableKill(kill)) continue;

      const timeIntoFight = kill.match_time - fight.start;
      const isEarlyInFight =
        realKillIdx <= cfg.maxKillIndex &&
        timeIntoFight <= cfg.earlyFightWindowSec;

      const preFightDamageCount = countCrossTeamDamage(
        damageEvents,
        kill.match_time - cfg.preFightWindowSec,
        kill.match_time
      );

      const lowPreFightDamage = preFightDamageCount <= cfg.damageCountThreshold;

      results.push({
        kill,
        killIndexInFight: realKillIdx,
        fightIndex: fightIdx,
        isRotationDeath: isEarlyInFight && lowPreFightDamage,
        preFightDamageCount,
        killDistance: computeKillDistance(kill),
        signals: { isEarlyInFight, lowPreFightDamage },
      });

      realKillIdx++;
    }
  }

  return results;
}

export function summarizeByPlayer(
  results: RotationDeathResult[]
): RotationDeathPlayerSummary[] {
  const map = new Map<
    string,
    { team: string; total: number; rotation: number }
  >();

  for (const r of results) {
    const key = `${r.kill.victim_name}::${r.kill.victim_team}`;
    const entry = map.get(key) ?? {
      team: r.kill.victim_team,
      total: 0,
      rotation: 0,
    };
    entry.total++;
    if (r.isRotationDeath) entry.rotation++;
    map.set(key, entry);
  }

  return Array.from(map.entries()).map(([key, data]) => ({
    playerName: key.split("::")[0],
    playerTeam: data.team,
    rotationDeathCount: data.rotation,
    totalDeaths: data.total,
    rotationDeathRate: data.total > 0 ? data.rotation / data.total : 0,
  }));
}
