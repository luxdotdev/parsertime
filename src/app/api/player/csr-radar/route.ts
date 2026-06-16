import { auth } from "@/lib/auth";
import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import { unauthorized } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";

const QuerySchema = z.object({
  hero: z.string().min(1),
  player: z.string().min(1).normalize("NFD"),
});

type LeaderboardRow =
  Awaited<ReturnType<typeof getCompositeSRLeaderboard>> extends (infer U)[]
    ? U
    : never;

function serializeRow(row: LeaderboardRow) {
  return {
    composite_sr: Number(row.composite_sr),
    player_name: row.player_name,
    rank: Number(row.rank),
    role: row.role,
    percentile: row.percentile,
    elims_per10:
      row.elims_per10 !== undefined ? Number(row.elims_per10) : undefined,
    fb_per10: row.fb_per10 !== undefined ? Number(row.fb_per10) : undefined,
    deaths_per10: Number(row.deaths_per10),
    damage_per10: Number(row.damage_per10),
    healing_per10:
      row.healing_per10 !== undefined ? Number(row.healing_per10) : undefined,
    blocked_per10:
      row.blocked_per10 !== undefined ? Number(row.blocked_per10) : undefined,
    solo_per10:
      row.solo_per10 !== undefined ? Number(row.solo_per10) : undefined,
    ults_per10:
      row.ults_per10 !== undefined ? Number(row.ults_per10) : undefined,
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) unauthorized();

  const parsed = QuerySchema.safeParse({
    hero: request.nextUrl.searchParams.get("hero"),
    player: request.nextUrl.searchParams.get("player"),
  });
  if (!parsed.success) {
    return new Response("Bad request", { status: 400 });
  }

  const { hero, player } = parsed.data;
  if (!Object.keys(heroRoleMapping).includes(hero)) {
    return new Response("Unknown hero", { status: 400 });
  }

  const leaderboard = await getCompositeSRLeaderboard({
    hero: hero as HeroName,
    limit: 10000,
  });

  const playerRow = leaderboard.find(
    (row) => row.player_name.toLowerCase() === player.toLowerCase()
  );

  return NextResponse.json({
    player: playerRow ? serializeRow(playerRow) : null,
    leaderboard: leaderboard.map(serializeRow),
  });
}
