import { auth } from "@/lib/auth";
import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import prisma from "@/lib/prisma";
import type { HeroName } from "@/types/heroes";
import { unauthorized } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import z from "zod";

type Top3Heroes = {
  player_hero: string;
  total_time_played: number;
}[];

const PlayerSchema = z.string().min(1).normalize("NFD");

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) unauthorized();

  const player = request.nextUrl.searchParams.get("player");
  if (!player) return new Response("Bad request", { status: 400 });

  const validPlayer = PlayerSchema.safeParse(player);
  if (!validPlayer.success) return new Response("Bad request", { status: 400 });

  const top3Heroes = await prisma.$queryRaw<Top3Heroes>`
    WITH final_rows AS (
      SELECT DISTINCT ON ("MapDataId", player_name, player_hero)
        player_hero,
        hero_time_played
      FROM
        "PlayerStat"
      WHERE
        player_name ILIKE ${validPlayer.data}
        AND hero_time_played > 0
      ORDER BY
        "MapDataId",
        player_name,
        player_hero,
        round_number DESC,
        id DESC
    )
    SELECT
      player_hero,
      SUM(hero_time_played) AS total_time_played
    FROM
      final_rows
    GROUP BY
      player_hero
    ORDER BY
      total_time_played DESC
    LIMIT
      3;
  `;

  const heroRatings = await Promise.all(
    top3Heroes.map(async (hero) => {
      const compositeLeaderboard = await getCompositeSRLeaderboard({
        hero: hero.player_hero as HeroName,
        player: validPlayer.data,
        limit: 300,
      });

      if (!compositeLeaderboard) {
        const mapsPlayed = await prisma.playerStat.groupBy({
          by: ["MapDataId"],
          where: {
            player_name: validPlayer.data,
            player_hero: hero.player_hero as HeroName,
            hero_time_played: {
              gt: 60,
            },
          },
        });

        const mapCount = mapsPlayed.length;

        return {
          ...hero,
          hero_rating: 0,
          mapsPlayed: mapCount,
          percentile: "0",
          rank: 0,
        };
      }

      return {
        ...hero,
        hero_rating: compositeLeaderboard?.composite_sr ?? 0,
        mapsPlayed: compositeLeaderboard?.maps ?? 0,
        percentile: compositeLeaderboard?.percentile ?? "0",
        rank: compositeLeaderboard?.rank ?? 0,
      };
    })
  );

  const result = top3Heroes.map((hero, index) => {
    return {
      ...hero,
      hero_rating: heroRatings[index].hero_rating ?? 0,
      mapsPlayed: heroRatings[index].mapsPlayed ?? 0,
      percentile: heroRatings[index].percentile ?? "0",
      rank: heroRatings[index].rank ?? 0,
    };
  });

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: validPlayer.data, mode: "insensitive" } },
        { battletag: { equals: validPlayer.data, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      bannerImage: true,
    },
  });

  let appliedTitle = null;
  if (user) {
    appliedTitle = await prisma.appliedTitle.findFirst({
      where: { userId: user.id },
      select: { title: true },
    });
  }

  return NextResponse.json({
    player: {
      name: user?.name ?? validPlayer.data,
      image: user?.image ?? null,
      title: appliedTitle?.title ?? null,
    },
    heroes: result,
  });
}
