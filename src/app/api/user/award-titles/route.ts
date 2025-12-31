import { getCompositeSRLeaderboard } from "@/lib/hero-rating";
import { Logger } from "@/lib/logger";
import { notifications } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import { $Enums } from "@prisma/client";
import { get } from "@vercel/edge-config";

// Title display names for notifications
const TITLE_DISPLAY_NAMES: Record<$Enums.Title, string> = {
  DEVELOPER: "Parsertime Developer",
  EMPLOYEE: "lux.dev Employee",
  BETA_TESTER: "Beta Tester",
  DAY_ONE_USER: "Here Since the Beginning",
  BASIC_PLAN_SUBSCRIBER: "Supporter",
  PREMIUM_PLAN_SUBSCRIBER: "Premium Supporter",
  VIP: "VIP",
  HIGHEST_RANK_ON_A_HERO: "Achieved Greatness",
  HIGHEST_AJAX_COUNT: "Ajax King",
  HIGHEST_FLETA_DEADLIFT_PERCENTAGE: "Fleta's Disciple",
  TOP_3_KILLS: "Serial Killer",
  TOP_3_DAMAGE_DEALT: "Damage Dealer",
  TOP_3_HEALING: "Ultimate Medic",
  TOP_3_DAMAGE_BLOCKED: "Tank Extraordinaire",
  TOP_3_DEATHS: "Professional Feeder",
  TOP_3_TIME_PLAYED: "Time Lord",
};

/**
 * Awards a title to users and sends notifications
 */
async function awardTitleWithNotification(
  title: $Enums.Title,
  userIds: string[]
) {
  if (userIds.length === 0) return;

  // Award the title
  await prisma.user.updateMany({
    where: {
      id: { in: userIds },
      NOT: {
        titles: { has: title },
      },
    },
    data: { titles: { push: title } },
  });

  // Send notifications to each user
  await Promise.all(
    userIds.map((userId) =>
      notifications
        .createInAppNotification({
          userId,
          title: "New Title Unlocked!",
          description: `You've unlocked the "${TITLE_DISPLAY_NAMES[title]}" title!`,
          href: "/profile",
        })
        .catch((error) => {
          Logger.error(`Failed to send notification to user ${userId}:`, error);
        })
    )
  );
}

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
    // Award developer title
    (async () => {
      const devUser = await prisma.user.findFirst({
        where: {
          email: "lucas@lux.dev",
          NOT: { titles: { has: $Enums.Title.DEVELOPER } },
        },
        select: { id: true },
      });
      if (devUser) {
        await awardTitleWithNotification($Enums.Title.DEVELOPER, [devUser.id]);
      }
    })(),

    // Award employee title to all admin users
    awardTitleWithNotification(
      $Enums.Title.EMPLOYEE,
      admins
        .filter((admin) => !admin.titles.includes($Enums.Title.EMPLOYEE))
        .map((admin) => admin.id)
    ),

    // Add beta tester title to all users on the whitelist
    (async () => {
      const betaTesters = await prisma.user.findMany({
        where: {
          email: { in: allowedUsers ?? [] },
          NOT: { titles: { has: $Enums.Title.BETA_TESTER } },
        },
        select: { id: true },
      });
      await awardTitleWithNotification(
        $Enums.Title.BETA_TESTER,
        betaTesters.map((u) => u.id)
      );
    })(),

    // Add day one user title
    awardTitleWithNotification(
      $Enums.Title.DAY_ONE_USER,
      dayOneUsers
        .filter((user) => !user.titles.includes($Enums.Title.DAY_ONE_USER))
        .map((user) => user.id)
    ),

    // Add basic plan subscriber title
    awardTitleWithNotification(
      $Enums.Title.BASIC_PLAN_SUBSCRIBER,
      basicPlanUsers
        .filter(
          (user) => !user.titles.includes($Enums.Title.BASIC_PLAN_SUBSCRIBER)
        )
        .map((user) => user.id)
    ),

    // Add premium plan subscriber title
    awardTitleWithNotification(
      $Enums.Title.PREMIUM_PLAN_SUBSCRIBER,
      premiumPlanUsers
        .filter(
          (user) => !user.titles.includes($Enums.Title.PREMIUM_PLAN_SUBSCRIBER)
        )
        .map((user) => user.id)
    ),

    // Award VIP title
    (async () => {
      const vipUserRecords = await prisma.user.findMany({
        where: {
          email: { in: vipUsers ?? [] },
          NOT: { titles: { has: $Enums.Title.VIP } },
        },
        select: { id: true },
      });
      await awardTitleWithNotification(
        $Enums.Title.VIP,
        vipUserRecords.map((u) => u.id)
      );
    })(),
  ]);

  // Award highest rank on a hero title to all users who have a rank 1 on a hero
  const topRankedUsers = await Promise.all(
    (Object.keys(heroRoleMapping) as HeroName[]).map(async (hero) => {
      const compositeLeaderboard = await getCompositeSRLeaderboard({
        hero,
        limit: 1,
      });

      if (compositeLeaderboard?.[0]) {
        const users = await prisma.user.findMany({
          where: {
            battletag: compositeLeaderboard?.[0]?.player_name,
            NOT: {
              titles: { has: $Enums.Title.HIGHEST_RANK_ON_A_HERO },
            },
          },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      return [];
    })
  );

  const uniqueTopRankedUserIds = [...new Set(topRankedUsers.flat())];
  await awardTitleWithNotification(
    $Enums.Title.HIGHEST_RANK_ON_A_HERO,
    uniqueTopRankedUserIds
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
    // Award highest AJAX count title
    (async () => {
      const users = await prisma.user.findMany({
        where: {
          battletag: { in: ajaxes.map((ajax) => ajax.playerName) },
          NOT: { titles: { has: $Enums.Title.HIGHEST_AJAX_COUNT } },
        },
        select: { id: true },
      });
      await awardTitleWithNotification(
        $Enums.Title.HIGHEST_AJAX_COUNT,
        users.map((u) => u.id)
      );
    })(),

    // Award highest Fleta deadlift percentage title
    ...(fletaDeadlifts
      ? [
          (async () => {
            const users = await prisma.user.findMany({
              where: {
                battletag: fletaDeadlifts.playerName,
                NOT: {
                  titles: {
                    has: $Enums.Title.HIGHEST_FLETA_DEADLIFT_PERCENTAGE,
                  },
                },
              },
              select: { id: true },
            });
            await awardTitleWithNotification(
              $Enums.Title.HIGHEST_FLETA_DEADLIFT_PERCENTAGE,
              users.map((u) => u.id)
            );
          })(),
        ]
      : []),

    // Award top 3 kills title
    (async () => {
      const users = await prisma.user.findMany({
        where: {
          battletag: { in: top3Kills.map((kill) => kill.attacker_name) },
          NOT: { titles: { has: $Enums.Title.TOP_3_KILLS } },
        },
        select: { id: true },
      });
      await awardTitleWithNotification(
        $Enums.Title.TOP_3_KILLS,
        users.map((u) => u.id)
      );
    })(),

    // Award top 3 damage dealt title
    (async () => {
      const users = await prisma.user.findMany({
        where: {
          battletag: {
            in: top3DamageDealt.map((damage) => damage.player_name),
          },
          NOT: { titles: { has: $Enums.Title.TOP_3_DAMAGE_DEALT } },
        },
        select: { id: true },
      });
      await awardTitleWithNotification(
        $Enums.Title.TOP_3_DAMAGE_DEALT,
        users.map((u) => u.id)
      );
    })(),

    // Award top 3 healing dealt title
    (async () => {
      const users = await prisma.user.findMany({
        where: {
          battletag: {
            in: top3HealingDealt.map((healing) => healing.player_name),
          },
          NOT: { titles: { has: $Enums.Title.TOP_3_HEALING } },
        },
        select: { id: true },
      });
      await awardTitleWithNotification(
        $Enums.Title.TOP_3_HEALING,
        users.map((u) => u.id)
      );
    })(),

    // Award top 3 damage blocked title
    (async () => {
      const users = await prisma.user.findMany({
        where: {
          battletag: {
            in: top3DamageBlocked.map((blocked) => blocked.player_name),
          },
          NOT: { titles: { has: $Enums.Title.TOP_3_DAMAGE_BLOCKED } },
        },
        select: { id: true },
      });
      await awardTitleWithNotification(
        $Enums.Title.TOP_3_DAMAGE_BLOCKED,
        users.map((u) => u.id)
      );
    })(),

    // Award top 3 deaths title
    (async () => {
      const users = await prisma.user.findMany({
        where: {
          battletag: { in: top3Deaths.map((death) => death.victim_name) },
          NOT: { titles: { has: $Enums.Title.TOP_3_DEATHS } },
        },
        select: { id: true },
      });
      await awardTitleWithNotification(
        $Enums.Title.TOP_3_DEATHS,
        users.map((u) => u.id)
      );
    })(),

    // Award top 3 time played title
    (async () => {
      const users = await prisma.user.findMany({
        where: {
          battletag: { in: top3TimePlayed.map((time) => time.player_name) },
          NOT: { titles: { has: $Enums.Title.TOP_3_TIME_PLAYED } },
        },
        select: { id: true },
      });
      await awardTitleWithNotification(
        $Enums.Title.TOP_3_TIME_PLAYED,
        users.map((u) => u.id)
      );
    })(),
  ]);

  return new Response("Titles awarded", { status: 200 });
}
