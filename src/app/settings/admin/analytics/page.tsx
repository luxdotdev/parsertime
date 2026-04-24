import { ActiveTeamsPieChart } from "@/components/admin/active-teams-pie-chart";
import { ActiveUsersPieChart } from "@/components/admin/active-users-pie-chart";
import { BillingPlanPieChart } from "@/components/admin/billing-plan-pie-chart";
import { MonthlyActiveTeamsChart } from "@/components/admin/monthly-active-teams-chart";
import { MonthlyActiveUsersChart } from "@/components/admin/monthly-active-users-chart";
import { MonthlyUserChart } from "@/components/admin/monthly-user-chart";
import { ScrimActivityChart } from "@/components/admin/scrim-activity-chart";
import { SignupMethodPieChart } from "@/components/admin/signup-method-pie-chart";
import { TeamCreationChart } from "@/components/admin/team-creation-chart";
import { TeamManagerPieChart } from "@/components/admin/team-manager-pie-chart";
import { NoAuthCard } from "@/components/auth/no-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

type MonthWindow = {
  monthStart: Date;
  monthEnd: Date;
  longLabel: string;
  shortLabel: string;
};

function buildMonthWindowsRange(
  startDate: Date,
  endDate: Date = new Date()
): MonthWindow[] {
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const windows: MonthWindow[] = [];
  while (cursor.getTime() <= endCursor.getTime()) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    windows.push({
      monthStart: new Date(cursor),
      monthEnd: next,
      longLabel: cursor.toLocaleDateString("en-US", { month: "long" }),
      shortLabel: cursor.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return windows;
}

async function getMonthlyUserData(firstUserDate: Date) {
  const windows = buildMonthWindowsRange(firstUserDate);

  const counts = await Promise.all(
    windows.map(({ monthStart, monthEnd }) =>
      prisma.user.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      })
    )
  );

  const historical = windows.map((w, i) => ({
    month: w.shortLabel,
    users: counts[i] ?? 0,
  }));

  const lastTwelveWindows = windows.slice(-12);
  const lastTwelveCounts = counts.slice(-12);
  const twelveMonth = lastTwelveWindows.map((w, i) => ({
    month: w.longLabel,
    users: lastTwelveCounts[i] ?? 0,
  }));

  return { twelveMonth, historical };
}

async function getScrimActivityData() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get scrims created in the last 30 days, grouped by day
  const scrimData = await prisma.scrim.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Group scrims by day
  const dailyData = new Map<string, number>();

  // Initialize all days in the range with 0
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split("T")[0];
    dailyData.set(dateKey, 0);
  }

  // Count scrims per day
  scrimData.forEach((scrim) => {
    const dateKey = scrim.createdAt.toISOString().split("T")[0];
    const currentCount = dailyData.get(dateKey) ?? 0;
    dailyData.set(dateKey, currentCount + 1);
  });

  // Convert to array
  const dataArray = Array.from(dailyData.entries()).map(([date, count]) => ({
    date,
    scrims: count,
  }));

  return dataArray;
}

async function getTeamCreationData(firstUserDate: Date) {
  const windows = buildMonthWindowsRange(firstUserDate);

  const counts = await Promise.all(
    windows.map(({ monthStart, monthEnd }) =>
      prisma.team.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      })
    )
  );

  const historical = windows.map((w, i) => ({
    month: w.shortLabel,
    teams: counts[i] ?? 0,
  }));

  const lastTwelveWindows = windows.slice(-12);
  const lastTwelveCounts = counts.slice(-12);
  const twelveMonth = lastTwelveWindows.map((w, i) => ({
    month: w.longLabel,
    teams: lastTwelveCounts[i] ?? 0,
  }));

  return { twelveMonth, historical };
}

async function getTeamManagerData() {
  const [totalUsers, teamManagers, teamOwners] = await Promise.all([
    prisma.user.count(),
    prisma.teamManager.groupBy({
      by: ["userId"],
      _count: {
        userId: true,
      },
    }),
    prisma.team.groupBy({
      by: ["ownerId"],
      _count: {
        ownerId: true,
      },
    }),
  ]);

  // Create sets to avoid double counting users who are both owners and managers
  const managerUserIds = new Set(teamManagers.map((tm) => tm.userId));
  const ownerUserIds = new Set(teamOwners.map((to) => to.ownerId));

  // Combine both sets to get unique power users (owners or managers)
  const powerUserIds = new Set([...managerUserIds, ...ownerUserIds]);
  const uniquePowerUsers = powerUserIds.size;
  const regularUsers = totalUsers - uniquePowerUsers;

  return [
    {
      role: "Regular Users",
      count: regularUsers,
      percentage: Math.round((regularUsers / totalUsers) * 100),
    },
    {
      role: "Power Users",
      count: uniquePowerUsers,
      percentage: Math.round((uniquePowerUsers / totalUsers) * 100),
    },
  ];
}

async function getSignupMethodData() {
  const [totalUsers, oauthAccounts] = await Promise.all([
    prisma.user.count(),
    prisma.account.groupBy({
      by: ["provider"],
      _count: {
        userId: true,
      },
    }),
  ]);

  // Create a map of provider counts
  const providerCounts = new Map<string, number>();
  let totalOAuthUsers = 0;

  oauthAccounts.forEach((account) => {
    const count = account._count.userId;
    providerCounts.set(account.provider, count);
    totalOAuthUsers += count;
  });

  // Users who signed up via email (no OAuth account)
  const emailUsers = totalUsers - totalOAuthUsers;

  // Build the result array
  const result = [];

  // Add email users
  if (emailUsers > 0) {
    result.push({
      method: "Email",
      count: emailUsers,
      percentage: Math.round((emailUsers / totalUsers) * 100),
    });
  }

  // Add OAuth providers
  const providerNames = {
    discord: "Discord",
    google: "Google",
    github: "GitHub",
  };

  ["discord", "google", "github"].forEach((provider) => {
    const count = providerCounts.get(provider) ?? 0;
    if (count > 0) {
      result.push({
        method: providerNames[provider as keyof typeof providerNames],
        count,
        percentage: Math.round((count / totalUsers) * 100),
      });
    }
  });

  return result;
}

async function getBillingPlanData() {
  const billingPlans = await prisma.user.groupBy({
    by: ["billingPlan"],
    _count: {
      id: true,
    },
  });

  const totalUsers = billingPlans.reduce(
    (sum, plan) => sum + plan._count.id,
    0
  );

  return billingPlans.map((plan) => ({
    plan: plan.billingPlan,
    count: plan._count.id,
    percentage: Math.round((plan._count.id / totalUsers) * 100),
  }));
}

async function getUserActivityData(firstUserDate: Date) {
  const windows = buildMonthWindowsRange(firstUserDate);

  const [totalUsers, counts] = await Promise.all([
    prisma.user.count(),
    Promise.all(
      windows.map(({ monthStart, monthEnd }) =>
        prisma.user.count({
          where: {
            teams: {
              some: {
                scrims: {
                  some: { createdAt: { gte: monthStart, lt: monthEnd } },
                },
              },
            },
          },
        })
      )
    ),
  ]);

  const historical = windows.map((w, i) => ({
    month: w.shortLabel,
    activeUsers: counts[i] ?? 0,
  }));

  const lastTwelveWindows = windows.slice(-12);
  const lastTwelveCounts = counts.slice(-12);
  const twelveMonth = lastTwelveWindows.map((w, i) => ({
    month: w.longLabel,
    activeUsers: lastTwelveCounts[i] ?? 0,
  }));

  const currentMonthActive = counts[counts.length - 1] ?? 0;
  const inactive = Math.max(totalUsers - currentMonthActive, 0);
  const safeTotal = totalUsers > 0 ? totalUsers : 1;

  const pieData: {
    status: "Active" | "Inactive";
    count: number;
    percentage: number;
  }[] = [
    {
      status: "Active",
      count: currentMonthActive,
      percentage: Math.round((currentMonthActive / safeTotal) * 100),
    },
    {
      status: "Inactive",
      count: inactive,
      percentage: Math.round((inactive / safeTotal) * 100),
    },
  ];

  return { monthlyActivity: { twelveMonth, historical }, pieData };
}

async function getTeamActivityData(firstUserDate: Date) {
  const windows = buildMonthWindowsRange(firstUserDate);

  const [totalTeams, counts] = await Promise.all([
    prisma.team.count(),
    Promise.all(
      windows.map(({ monthStart, monthEnd }) =>
        prisma.team.count({
          where: {
            scrims: {
              some: { createdAt: { gte: monthStart, lt: monthEnd } },
            },
          },
        })
      )
    ),
  ]);

  const historical = windows.map((w, i) => ({
    month: w.shortLabel,
    activeTeams: counts[i] ?? 0,
  }));

  const lastTwelveWindows = windows.slice(-12);
  const lastTwelveCounts = counts.slice(-12);
  const twelveMonth = lastTwelveWindows.map((w, i) => ({
    month: w.longLabel,
    activeTeams: lastTwelveCounts[i] ?? 0,
  }));

  const currentMonthActive = counts[counts.length - 1] ?? 0;
  const inactive = Math.max(totalTeams - currentMonthActive, 0);
  const safeTotal = totalTeams > 0 ? totalTeams : 1;

  const pieData: {
    status: "Active" | "Inactive";
    count: number;
    percentage: number;
  }[] = [
    {
      status: "Active",
      count: currentMonthActive,
      percentage: Math.round((currentMonthActive / safeTotal) * 100),
    },
    {
      status: "Inactive",
      count: inactive,
      percentage: Math.round((inactive / safeTotal) * 100),
    },
  ];

  return { monthlyActivity: { twelveMonth, historical }, pieData };
}

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );
  if (!user) {
    redirect("/sign-up");
  }
  if (user.role !== $Enums.UserRole.ADMIN) {
    return NoAuthCard();
  }

  const t = await getTranslations("settingsPage.admin.analytics");

  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const firstUserDate = firstUser?.createdAt ?? new Date();

  const [
    monthlyUserData,
    scrimActivityData,
    teamCreationData,
    teamManagerData,
    signupMethodData,
    billingPlanData,
    userActivityData,
    teamActivityData,
  ] = await Promise.all([
    getMonthlyUserData(firstUserDate),
    getScrimActivityData(),
    getTeamCreationData(firstUserDate),
    getTeamManagerData(),
    getSignupMethodData(),
    getBillingPlanData(),
    getUserActivityData(firstUserDate),
    getTeamActivityData(firstUserDate),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <Separator />
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("activeUsers.title")}</CardTitle>
              <CardDescription>{t("activeUsers.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ActiveUsersPieChart data={userActivityData.pieData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("monthlyActiveUsers.title")}</CardTitle>
              <CardDescription>
                {t("monthlyActiveUsers.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyActiveUsersChart
                twelveMonth={userActivityData.monthlyActivity.twelveMonth}
                historical={userActivityData.monthlyActivity.historical}
              />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("activeTeams.title")}</CardTitle>
              <CardDescription>{t("activeTeams.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ActiveTeamsPieChart data={teamActivityData.pieData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("monthlyActiveTeams.title")}</CardTitle>
              <CardDescription>
                {t("monthlyActiveTeams.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyActiveTeamsChart
                twelveMonth={teamActivityData.monthlyActivity.twelveMonth}
                historical={teamActivityData.monthlyActivity.historical}
              />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("userGrowth.title")}</CardTitle>
              <CardDescription>{t("userGrowth.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyUserChart
                twelveMonth={monthlyUserData.twelveMonth}
                historical={monthlyUserData.historical}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("signupMethods.title")}</CardTitle>
              <CardDescription>
                {t("signupMethods.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignupMethodPieChart data={signupMethodData} />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("billingPlans.title")}</CardTitle>
              <CardDescription>{t("billingPlans.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <BillingPlanPieChart data={billingPlanData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("scrimActivity.title")}</CardTitle>
              <CardDescription>
                {t("scrimActivity.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrimActivityChart data={scrimActivityData} />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("teamCreations.title")}</CardTitle>
              <CardDescription>
                {t("teamCreations.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamCreationChart
                twelveMonth={teamCreationData.twelveMonth}
                historical={teamCreationData.historical}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("teamManagerDistribution.title")}</CardTitle>
              <CardDescription>
                {t("teamManagerDistribution.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamManagerPieChart data={teamManagerData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
