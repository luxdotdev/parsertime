import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type PlayerPosition = {
  playerName: string;
  playerTeam: string;
  hero: string;
  x: number;
  z: number;
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mapDataId = searchParams.get("mapDataId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!mapDataId || !start || !end) {
    return NextResponse.json(
      { error: "Missing mapDataId, start, or end parameters" },
      { status: 400 }
    );
  }

  const id = parseInt(mapDataId);
  const fightStart = parseFloat(start);
  const fightEnd = parseFloat(end);

  const [kills, damage, healing, ability1, ability2] = await Promise.all([
    prisma.kill.findMany({
      where: {
        MapDataId: id,
        match_time: { gte: fightStart, lte: fightEnd },
      },
      select: {
        attacker_name: true,
        attacker_team: true,
        attacker_hero: true,
        attacker_x: true,
        attacker_z: true,
        victim_name: true,
        victim_team: true,
        victim_hero: true,
        victim_x: true,
        victim_z: true,
        match_time: true,
      },
    }),
    prisma.damage.findMany({
      where: {
        MapDataId: id,
        match_time: { gte: fightStart, lte: fightEnd },
      },
      select: {
        attacker_name: true,
        attacker_team: true,
        attacker_hero: true,
        attacker_x: true,
        attacker_z: true,
        victim_name: true,
        victim_team: true,
        victim_hero: true,
        victim_x: true,
        victim_z: true,
        match_time: true,
      },
    }),
    prisma.healing.findMany({
      where: {
        MapDataId: id,
        match_time: { gte: fightStart, lte: fightEnd },
      },
      select: {
        healer_name: true,
        healer_team: true,
        healer_hero: true,
        healer_x: true,
        healer_z: true,
        healee_name: true,
        healee_team: true,
        healee_hero: true,
        healee_x: true,
        healee_z: true,
        match_time: true,
      },
    }),
    prisma.ability1Used.findMany({
      where: {
        MapDataId: id,
        match_time: { gte: fightStart, lte: fightEnd },
      },
      select: {
        player_name: true,
        player_team: true,
        player_hero: true,
        player_x: true,
        player_z: true,
        match_time: true,
      },
    }),
    prisma.ability2Used.findMany({
      where: {
        MapDataId: id,
        match_time: { gte: fightStart, lte: fightEnd },
      },
      select: {
        player_name: true,
        player_team: true,
        player_hero: true,
        player_x: true,
        player_z: true,
        match_time: true,
      },
    }),
  ]);

  const latest = new Map<string, { pos: PlayerPosition; time: number }>();

  function track(
    name: string,
    team: string,
    hero: string,
    x: number | null,
    z: number | null,
    time: number
  ) {
    if (x == null || z == null) return;
    const key = `${name}::${team}`;
    const existing = latest.get(key);
    if (!existing || time > existing.time) {
      latest.set(key, {
        pos: { playerName: name, playerTeam: team, hero, x, z },
        time,
      });
    }
  }

  for (const k of kills) {
    track(
      k.attacker_name,
      k.attacker_team,
      k.attacker_hero,
      k.attacker_x,
      k.attacker_z,
      k.match_time
    );
    track(
      k.victim_name,
      k.victim_team,
      k.victim_hero,
      k.victim_x,
      k.victim_z,
      k.match_time
    );
  }
  for (const d of damage) {
    track(
      d.attacker_name,
      d.attacker_team,
      d.attacker_hero,
      d.attacker_x,
      d.attacker_z,
      d.match_time
    );
    track(
      d.victim_name,
      d.victim_team,
      d.victim_hero,
      d.victim_x,
      d.victim_z,
      d.match_time
    );
  }
  for (const h of healing) {
    track(
      h.healer_name,
      h.healer_team,
      h.healer_hero,
      h.healer_x,
      h.healer_z,
      h.match_time
    );
    track(
      h.healee_name,
      h.healee_team,
      h.healee_hero,
      h.healee_x,
      h.healee_z,
      h.match_time
    );
  }
  for (const a of ability1) {
    track(
      a.player_name,
      a.player_team,
      a.player_hero,
      a.player_x,
      a.player_z,
      a.match_time
    );
  }
  for (const a of ability2) {
    track(
      a.player_name,
      a.player_team,
      a.player_hero,
      a.player_x,
      a.player_z,
      a.match_time
    );
  }

  const players: PlayerPosition[] = Array.from(latest.values()).map(
    (v) => v.pos
  );

  return NextResponse.json({ players });
}
