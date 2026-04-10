import { TeamTargetsOverview } from "@/components/targets/team-targets-overview";
import { Link } from "@/components/ui/link";
import {
  calculateTargetProgress,
  TargetsService,
  type TargetProgress,
} from "@/data/player";
import { TeamSharedDataService } from "@/data/team";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { RoleName } from "@/lib/target-stats";
import { type HeroName, heroRoleMapping } from "@/types/heroes";
import { $Enums } from "@prisma/client";

type Props = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamTargetsPage(props: Props) {
  const params = await props.params;
  const teamId = parseInt(params.teamId);

  const session = await auth();
  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session?.user?.email)))
  );

  if (!user) {
    return (
      <div className="flex-1 p-8 pt-6">
        <p className="text-muted-foreground">Please sign in to view targets.</p>
      </div>
    );
  }

  // Premium check (team owner's billing plan)
  const team = await prisma.team.findFirst({ where: { id: teamId } });
  if (!team) {
    return (
      <div className="flex-1 p-8 pt-6">
        <p className="text-muted-foreground">Team not found.</p>
      </div>
    );
  }

  const teamOwner = await prisma.user.findFirst({
    where: { id: team.ownerId },
  });

  const isPremium =
    user.role === $Enums.UserRole.ADMIN ||
    teamOwner?.billingPlan === $Enums.BillingPlan.PREMIUM;

  if (!isPremium) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Player Targets</h2>
        <div className="bg-card rounded-xl border p-8 text-center shadow">
          <h3 className="text-xl font-semibold">Premium Feature</h3>
          <p className="text-muted-foreground mt-2">
            Player targets require a Premium plan. Upgrade to set measurable
            improvement goals for your players.
          </p>
          <Link
            href="/pricing"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-block rounded-md px-4 py-2"
          >
            View Pricing
          </Link>
        </div>
      </div>
    );
  }

  // Check permissions
  const teamManagers = await prisma.teamManager.findMany({
    where: { teamId },
  });
  const isManager = teamManagers.some((m) => m.userId === user.id);
  const hasPerms =
    isManager ||
    user.id === team.ownerId ||
    user.role === $Enums.UserRole.MANAGER ||
    user.role === $Enums.UserRole.ADMIN;

  // Use scrim-based roster (same as team stats page) instead of team membership
  const [roster, teamMembersData, targetsByPlayer] = await Promise.all([
    AppRuntime.runPromise(
      TeamSharedDataService.pipe(
        Effect.flatMap((svc) => svc.getTeamRoster(teamId))
      )
    ),
    prisma.team.findFirst({
      where: { id: teamId },
      select: {
        users: {
          select: { id: true, name: true, image: true, battletag: true },
        },
      },
    }),
    AppRuntime.runPromise(
      TargetsService.pipe(Effect.flatMap((svc) => svc.getTeamTargets(teamId)))
    ),
  ]);

  // Build a lookup of registered team members by name/battletag (case-insensitive)
  const teamUsers = teamMembersData?.users ?? [];
  const userByPlayerName = new Map<
    string,
    {
      id: string;
      name: string | null;
      image: string | null;
      battletag: string | null;
    }
  >();
  for (const u of teamUsers) {
    if (u.name) userByPlayerName.set(u.name.toLowerCase(), u);
    if (u.battletag) userByPlayerName.set(u.battletag.toLowerCase(), u);
  }

  // For each roster player, get their role and scrim stats
  const players = await Promise.all(
    roster.map(async (playerName) => {
      const matchedUser = userByPlayerName.get(playerName.toLowerCase());
      const isOnTeam = !!matchedUser;

      // Determine primary role from most-played hero
      const topHero = await prisma.$queryRaw<
        { player_hero: string; total_time: number }[]
      >`
        SELECT player_hero, SUM(hero_time_played) AS total_time
        FROM "PlayerStat"
        WHERE player_name ILIKE ${playerName}
          AND hero_time_played > 0
        GROUP BY player_hero
        ORDER BY total_time DESC
        LIMIT 1
      `;

      const role: RoleName =
        topHero.length > 0
          ? (heroRoleMapping[topHero[0].player_hero as HeroName] ?? "Damage")
          : "Damage";

      const targets = targetsByPlayer[playerName] ?? [];

      // Get scrim window from the largest target window or default 10
      const maxWindow =
        targets.length > 0
          ? Math.max(...targets.map((t) => t.scrimWindow))
          : 10;
      const scrimStats = await AppRuntime.runPromise(
        TargetsService.pipe(
          Effect.flatMap((svc) =>
            svc.getRecentScrimStats(playerName, teamId, maxWindow)
          )
        )
      );

      // Calculate progress for each target
      const progressMap: Record<number, TargetProgress> = {};
      for (const target of targets) {
        const windowStats = scrimStats.slice(-target.scrimWindow);
        const progress = calculateTargetProgress(target, windowStats);
        progressMap[target.id] = { ...progress, target };
      }

      return {
        name: playerName,
        image: matchedUser?.image ?? null,
        role,
        targets,
        scrimStats,
        progressMap,
        isOnTeam,
      };
    })
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Player Targets</h2>
      </div>
      <TeamTargetsOverview
        players={players}
        teamId={teamId}
        hasPerms={hasPerms}
      />
    </div>
  );
}
