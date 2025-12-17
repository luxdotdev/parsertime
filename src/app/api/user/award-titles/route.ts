import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import prisma from "@/lib/prisma";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import { $Enums } from "@prisma/client";
import { get } from "@vercel/edge-config";

export async function GET() {
  // No auth since this will run via cron

  // Fetch all user data in parallel
  const [
    admins,
    allowedUsers,
    dayOneUsers,
    basicPlanUsers,
    premiumPlanUsers,
    vipUsers,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: $Enums.UserRole.ADMIN,
      },
      select: {
        id: true,
        titles: true,
      },
    }),
    get<string[]>("allowedUsers"),
    prisma.user.findMany({
      where: {
        createdAt: { lt: new Date("2024-04-14") },
      },
      select: {
        id: true,
        titles: true,
      },
    }),
    prisma.user.findMany({
      where: {
        billingPlan: $Enums.BillingPlan.BASIC,
      },
      select: {
        id: true,
        titles: true,
      },
    }),
    prisma.user.findMany({
      where: {
        billingPlan: $Enums.BillingPlan.PREMIUM,
      },
      select: {
        id: true,
        titles: true,
      },
    }),
    get<string[]>("vipUsers"),
  ]);

  // Award all user-based titles in parallel
  await Promise.all([
    // Award developer title to myself
    prisma.user.updateMany({
      where: {
        email: "lucas@lux.dev",
        NOT: {
          titles: { has: $Enums.Title.DEVELOPER },
        },
      },
      data: {
        titles: { push: $Enums.Title.DEVELOPER },
      },
    }),
    // Award employee title to all admin users
    ...admins
      .filter((admin) => !admin.titles.includes($Enums.Title.EMPLOYEE))
      .map((admin) =>
        prisma.user.update({
          where: { id: admin.id },
          data: { titles: { push: $Enums.Title.EMPLOYEE } },
        })
      ),
    // Add beta tester title to all users on the whitelist
    prisma.user.updateMany({
      where: {
        email: { in: allowedUsers ?? [] },
        NOT: {
          titles: { has: $Enums.Title.BETA_TESTER },
        },
      },
      data: { titles: { push: $Enums.Title.BETA_TESTER } },
    }),
    // Add day one user title to all users who signed up before the launch date
    ...dayOneUsers
      .filter((user) => !user.titles.includes($Enums.Title.DAY_ONE_USER))
      .map((user) =>
        prisma.user.update({
          where: { id: user.id },
          data: { titles: { push: $Enums.Title.DAY_ONE_USER } },
        })
      ),
    // Add basic plan subscriber title to all users on the basic plan
    ...basicPlanUsers
      .filter(
        (user) => !user.titles.includes($Enums.Title.BASIC_PLAN_SUBSCRIBER)
      )
      .map((user) =>
        prisma.user.update({
          where: { id: user.id },
          data: { titles: { push: $Enums.Title.BASIC_PLAN_SUBSCRIBER } },
        })
      ),
    // Add premium plan subscriber title to all users on the premium plan
    ...premiumPlanUsers
      .filter(
        (user) => !user.titles.includes($Enums.Title.PREMIUM_PLAN_SUBSCRIBER)
      )
      .map((user) =>
        prisma.user.update({
          where: { id: user.id },
          data: { titles: { push: $Enums.Title.PREMIUM_PLAN_SUBSCRIBER } },
        })
      ),
    // Award VIP title to all users who have a VIP status
    prisma.user.updateMany({
      where: {
        email: { in: vipUsers ?? [] },
        NOT: {
          titles: { has: $Enums.Title.VIP },
        },
      },
      data: { titles: { push: $Enums.Title.VIP } },
    }),
  ]);

  // Award highest rank on a hero title to all users who have a rank 1 on a hero
  await Promise.all(
    (Object.keys(heroRoleMapping) as HeroName[]).map(async (hero) => {
      const compositeLeaderboard = await getCompositeSRLeaderboard({
        hero,
        limit: 1,
      });

      if (compositeLeaderboard?.[0]) {
        await prisma.user.updateMany({
          where: {
            battletag: compositeLeaderboard?.[0]?.player_name,
            NOT: {
              titles: { has: $Enums.Title.HIGHEST_RANK_ON_A_HERO },
            },
          },
          data: { titles: { push: $Enums.Title.HIGHEST_RANK_ON_A_HERO } },
        });
      }
    })
  );

  // Fetch all stat-based data in parallel
  const [
    ajaxes,
    fletaDeadlifts,
    top3Kills,
    top3DamageDealt,
    top3HealingDealt,
    top3DamageBlocked,
    top3Deaths,
    top3TimePlayed,
  ] = await Promise.all([
    prisma.$queryRaw<{ playerName: string; total_ajaxes: number }[]>`SELECT
      "playerName",
      SUM("value") AS total_ajaxes
    FROM "CalculatedStat"
    WHERE "stat" = 'AJAX_COUNT'
    GROUP BY "playerName"
    ORDER BY total_ajaxes DESC
    LIMIT 100;`,
    prisma.calculatedStat.findFirst({
      where: {
        stat: $Enums.CalculatedStatType.FLETA_DEADLIFT_PERCENTAGE,
      },
      orderBy: { value: "desc" },
    }),
    prisma.kill.groupBy({
      by: ["attacker_name"],
      _count: { attacker_name: true },
      orderBy: { _count: { attacker_name: "desc" } },
      take: 3,
    }),
    prisma.playerStat.groupBy({
      by: ["player_name"],
      _sum: { hero_damage_dealt: true },
      orderBy: { _sum: { hero_damage_dealt: "desc" } },
      take: 3,
    }),
    prisma.playerStat.groupBy({
      by: ["player_name"],
      _sum: { healing_dealt: true },
      orderBy: { _sum: { healing_dealt: "desc" } },
      take: 3,
    }),
    prisma.playerStat.groupBy({
      by: ["player_name"],
      _sum: { damage_blocked: true },
      orderBy: { _sum: { damage_blocked: "desc" } },
      take: 3,
    }),
    prisma.kill.groupBy({
      by: ["victim_name"],
      _count: { victim_name: true },
      orderBy: { _count: { victim_name: "desc" } },
      take: 3,
    }),
    prisma.playerStat.groupBy({
      by: ["player_name"],
      _sum: { hero_time_played: true },
      orderBy: { _sum: { hero_time_played: "desc" } },
      take: 3,
    }),
  ]);

  // Award all stat-based titles in parallel
  await Promise.all([
    // Award highest AJAX count title to all users who have the highest AJAX count
    prisma.user.updateMany({
      where: {
        battletag: { in: ajaxes.map((ajax) => ajax.playerName) },
        NOT: {
          titles: { has: $Enums.Title.HIGHEST_AJAX_COUNT },
        },
      },
      data: { titles: { push: $Enums.Title.HIGHEST_AJAX_COUNT } },
    }),
    // Award highest Fleta deadlift percentage title to all users who have the highest Fleta deadlift percentage
    ...(fletaDeadlifts
      ? [
          prisma.user.updateMany({
            where: {
              battletag: fletaDeadlifts.playerName,
              NOT: {
                titles: { has: $Enums.Title.HIGHEST_FLETA_DEADLIFT_PERCENTAGE },
              },
            },
            data: {
              titles: { push: $Enums.Title.HIGHEST_FLETA_DEADLIFT_PERCENTAGE },
            },
          }),
        ]
      : []),
    // Award top 3 kills title to all users who have the top 3 kills
    prisma.user.updateMany({
      where: {
        battletag: { in: top3Kills.map((kill) => kill.attacker_name) },
        NOT: {
          titles: { has: $Enums.Title.TOP_3_KILLS },
        },
      },
      data: { titles: { push: $Enums.Title.TOP_3_KILLS } },
    }),
    // Award top 3 damage dealt title to all users who have the top 3 damage dealt
    prisma.user.updateMany({
      where: {
        battletag: { in: top3DamageDealt.map((damage) => damage.player_name) },
        NOT: {
          titles: { has: $Enums.Title.TOP_3_DAMAGE_DEALT },
        },
      },
      data: { titles: { push: $Enums.Title.TOP_3_DAMAGE_DEALT } },
    }),
    // Award top 3 healing dealt title to all users who have the top 3 healing dealt
    prisma.user.updateMany({
      where: {
        battletag: {
          in: top3HealingDealt.map((healing) => healing.player_name),
        },
        NOT: {
          titles: { has: $Enums.Title.TOP_3_HEALING },
        },
      },
      data: { titles: { push: $Enums.Title.TOP_3_HEALING } },
    }),
    // Award top 3 damage blocked title to all users who have the top 3 damage blocked
    prisma.user.updateMany({
      where: {
        battletag: {
          in: top3DamageBlocked.map((blocked) => blocked.player_name),
        },
        NOT: {
          titles: { has: $Enums.Title.TOP_3_DAMAGE_BLOCKED },
        },
      },
      data: { titles: { push: $Enums.Title.TOP_3_DAMAGE_BLOCKED } },
    }),
    // Award top 3 deaths title to all users who have the top 3 deaths
    prisma.user.updateMany({
      where: {
        battletag: { in: top3Deaths.map((death) => death.victim_name) },
        NOT: {
          titles: { has: $Enums.Title.TOP_3_DEATHS },
        },
      },
      data: { titles: { push: $Enums.Title.TOP_3_DEATHS } },
    }),
    // Award top 3 time played title to all users who have the top 3 time played
    prisma.user.updateMany({
      where: {
        battletag: { in: top3TimePlayed.map((time) => time.player_name) },
        NOT: {
          titles: { has: $Enums.Title.TOP_3_TIME_PLAYED },
        },
      },
      data: { titles: { push: $Enums.Title.TOP_3_TIME_PLAYED } },
    }),
  ]);

  return new Response("Titles awarded", { status: 200 });
}
