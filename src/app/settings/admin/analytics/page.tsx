import { BillingPlanPieChart } from "@/components/admin/billing-plan-pie-chart";
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
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

async function getMonthlyUserData() {
  const now = new Date();
  const monthlyData = [];

  // Get data for the last 12 months
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const userCount = await prisma.user.count({
      where: {
        createdAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    });

    const monthName = monthStart.toLocaleDateString("en-US", { month: "long" });
    monthlyData.push({
      month: monthName,
      users: userCount,
    });
  }

  return monthlyData;
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

async function getTeamCreationData() {
  const now = new Date();
  const monthlyData = [];

  // Get data for the last 12 months
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const teamCount = await prisma.team.count({
      where: {
        createdAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    });

    const monthName = monthStart.toLocaleDateString("en-US", { month: "long" });
    monthlyData.push({
      month: monthName,
      teams: teamCount,
    });
  }

  return monthlyData;
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

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session.user.email);
  if (!user) {
    redirect("/sign-up");
  }
  if (user.role !== $Enums.UserRole.ADMIN) {
    return NoAuthCard();
  }

  const t = await getTranslations("settingsPage.admin.analytics");
  const [
    monthlyUserData,
    scrimActivityData,
    teamCreationData,
    teamManagerData,
    signupMethodData,
    billingPlanData,
  ] = await Promise.all([
    getMonthlyUserData(),
    getScrimActivityData(),
    getTeamCreationData(),
    getTeamManagerData(),
    getSignupMethodData(),
    getBillingPlanData(),
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
              <CardTitle>{t("userGrowth.title")}</CardTitle>
              <CardDescription>{t("userGrowth.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyUserChart data={monthlyUserData} />
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
              <TeamCreationChart data={teamCreationData} />
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
