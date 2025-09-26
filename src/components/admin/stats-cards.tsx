import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { TrendingDown, TrendingUp, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : delta;
}

async function getUserStats() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [totalUsers, usersThisMonth, usersLastMonth] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: thisMonthStart,
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: lastMonthStart,
          lt: thisMonthStart,
        },
      },
    }),
  ]);

  // Calculate growth comparison
  const growthComparison = usersThisMonth - usersLastMonth;
  const growthTrend =
    growthComparison > 0 ? "up" : growthComparison < 0 ? "down" : "neutral";

  return {
    totalUsers,
    monthlyGrowth: usersThisMonth,
    usersThisMonth,
    usersLastMonth,
    growthComparison,
    growthTrend,
  };
}

export async function StatsCards() {
  const t = await getTranslations("settingsPage.admin.dashboard.stats-cards");
  const {
    totalUsers,
    monthlyGrowth,
    usersThisMonth,
    usersLastMonth,
    growthComparison,
    growthTrend,
  } = await getUserStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total-users.title")}
          </CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalUsers.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("total-users.delta", {
              delta: formatDelta(monthlyGrowth),
            })}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("user-growth.title")}
          </CardTitle>
          {growthTrend === "up" && (
            <TrendingUp className="h-4 w-4 text-green-500" />
          )}
          {growthTrend === "down" && (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          {growthTrend === "neutral" && (
            <Users className="text-muted-foreground h-4 w-4" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {usersThisMonth.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("user-growth.delta", {
              delta: formatDelta(growthComparison),
              lastMonth: usersLastMonth.toLocaleString(),
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
