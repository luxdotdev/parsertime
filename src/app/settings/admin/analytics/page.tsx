import { MonthlyUserChart } from "@/components/admin/monthly-user-chart";
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
  const monthlyUserData = await getMonthlyUserData();

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
      </div>
    </div>
  );
}
