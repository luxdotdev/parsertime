import { MIN_ROUTE_LENGTH_M, MIN_ROUTE_POINTS } from "@/lib/routes/constants";

export type RouteSample = {
  t: number;
  playerName: string;
  playerTeam: string;
  x: number;
  z: number;
};

export type ContactEvent = { t: number; players: string[] };
export type DeathEvent = { t: number; playerName: string };
export type RoundStartMark = { t: number; roundNumber: number };

export type Route = {
  playerName: string;
  playerTeam: string;
  roundNumber: number;
  kind: "INITIAL" | "RESPAWN";
  startT: number;
  endT: number;
  points: { x: number; z: number }[];
};

function pathLength(points: { x: number; z: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].z - points[i - 1].z
    );
  }
  return total;
}

/**
 * Per player per life: a life starts at a round start (INITIAL) or the
 * player's death (RESPAWN; the route's points begin at the first sample
 * after death). The route ends at the player's first contact in that
 * life. Lives without contact produce no route.
 */
export function extractRoutes(
  samples: RouteSample[],
  contacts: ContactEvent[],
  deaths: DeathEvent[],
  roundStarts: RoundStartMark[],
  maxTime: number
): Route[] {
  const players = [...new Set(samples.map((s) => s.playerName))];
  const sortedRounds = [...roundStarts].sort((a, b) => a.t - b.t);
  const sortedContacts = [...contacts].sort((a, b) => a.t - b.t);
  const routes: Route[] = [];

  for (const player of players) {
    const mySamples = samples
      .filter((s) => s.playerName === player)
      .sort((a, b) => a.t - b.t);
    if (mySamples.length === 0) continue;
    const myDeaths = deaths
      .filter((d) => d.playerName === player)
      .sort((a, b) => a.t - b.t);

    const lifeStarts: { t: number; kind: Route["kind"] }[] = [
      ...sortedRounds.map((r) => ({ t: r.t, kind: "INITIAL" as const })),
      ...myDeaths.map((d) => ({ t: d.t, kind: "RESPAWN" as const })),
    ].sort((a, b) => a.t - b.t);

    for (let i = 0; i < lifeStarts.length; i++) {
      const start = lifeStarts[i];
      const lifeEnd = i + 1 < lifeStarts.length ? lifeStarts[i + 1].t : maxTime;

      const contact = sortedContacts.find(
        (c) => c.t >= start.t && c.t <= lifeEnd && c.players.includes(player)
      );
      if (!contact) continue;

      const points = mySamples.filter(
        (s) => s.t >= start.t && s.t <= contact.t
      );
      if (points.length < MIN_ROUTE_POINTS) continue;
      const coords = points.map((p) => ({ x: p.x, z: p.z }));
      if (pathLength(coords) < MIN_ROUTE_LENGTH_M) continue;

      let roundNumber = sortedRounds[0]?.roundNumber ?? 1;
      for (const r of sortedRounds) {
        if (r.t <= start.t) roundNumber = r.roundNumber;
        else break;
      }

      routes.push({
        playerName: player,
        playerTeam: points[0] ? mySamples[0].playerTeam : "",
        roundNumber,
        kind: start.kind,
        startT: points[0].t,
        endT: contact.t,
        points: coords,
      });
    }
  }
  return routes.sort((a, b) => a.startT - b.startT);
}
