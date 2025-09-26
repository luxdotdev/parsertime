import { MonthlyUserChart } from "@/components/admin/monthly-user-chart";
import { ScrimActivityChart } from "@/components/admin/scrim-activity-chart";
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
  const [monthlyUserData, scrimActivityData] = await Promise.all([
    getMonthlyUserData(),
    getScrimActivityData(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <Separator />
      <div className="space-y-6">
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
            <CardTitle>{t("scrimActivity.title")}</CardTitle>
            <CardDescription>{t("scrimActivity.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrimActivityChart data={scrimActivityData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
