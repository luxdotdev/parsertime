import { UsageReportEmail } from "@/components/email/usage-report";
import { email } from "@/lib/email";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { render } from "@react-email/render";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisWeek,
    newUsersLastWeek,
    totalScrims,
    newScrimsThisWeek,
    newScrimsLastWeek,
    totalTeams,
    newTeamsThisWeek,
    newTeamsLastWeek,
    paidUsers,
    billingPlanGroups,
    oauthAccounts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.user.count({
      where: { createdAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.scrim.count(),
    prisma.scrim.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.scrim.count({
      where: { createdAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.team.count(),
    prisma.team.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.team.count({
      where: { createdAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.user.count({ where: { billingPlan: { not: "FREE" } } }),
    prisma.user.groupBy({ by: ["billingPlan"], _count: { id: true } }),
    prisma.account.groupBy({ by: ["provider"], _count: { userId: true } }),
  ]);

  const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

  const billingPlanTotal = billingPlanGroups.reduce(
    (sum, p) => sum + p._count.id,
    0
  );
  const billingPlans = billingPlanGroups.map((p) => ({
    plan: p.billingPlan,
    count: p._count.id,
    percentage:
      billingPlanTotal > 0
        ? Math.round((p._count.id / billingPlanTotal) * 100)
        : 0,
  }));

  const providerCounts = new Map<string, number>();
  let totalOAuthUsers = 0;
  for (const account of oauthAccounts) {
    providerCounts.set(account.provider, account._count.userId);
    totalOAuthUsers += account._count.userId;
  }
  const emailOnlyUsers = totalUsers - totalOAuthUsers;
  const signupMethodsTotal = totalUsers;

  const signupMethods = [
    ...(emailOnlyUsers > 0
      ? [
          {
            method: "Email",
            count: emailOnlyUsers,
            percentage:
              signupMethodsTotal > 0
                ? Math.round((emailOnlyUsers / signupMethodsTotal) * 100)
                : 0,
          },
        ]
      : []),
    ...["discord", "google", "github"]
      .filter((provider) => (providerCounts.get(provider) ?? 0) > 0)
      .map((provider) => {
        const count = providerCounts.get(provider) ?? 0;
        return {
          method: provider.charAt(0).toUpperCase() + provider.slice(1),
          count,
          percentage:
            signupMethodsTotal > 0
              ? Math.round((count / signupMethodsTotal) * 100)
              : 0,
        };
      }),
  ];

  const emailHtml = await render(
    UsageReportEmail({
      weekStart: formatDate(weekStart),
      weekEnd: formatDate(now),
      newUsersThisWeek,
      newUsersLastWeek,
      newScrimsThisWeek,
      newScrimsLastWeek,
      newTeamsThisWeek,
      newTeamsLastWeek,
      totalUsers,
      totalScrims,
      totalTeams,
      paidUsers,
      conversionRate,
      signupMethods,
      billingPlans,
    })
  );

  try {
    await email.sendEmail({
      to: "lucas@lux.dev",
      subject: `Parsertime Weekly Report — ${formatDate(weekStart)} to ${formatDate(now)}`,
      html: emailHtml,
    });
    Logger.info(`Usage report sent to lucas@lux.dev`);
  } catch (err) {
    Logger.error(`Failed to send usage report to lucas@lux.dev`, err);
    return new Response("Failed to send usage report", { status: 500 });
  }

  return Response.json({
    success: true,
    stats: {
      newUsersThisWeek,
      newScrimsThisWeek,
      newTeamsThisWeek,
      totalUsers,
      totalScrims,
      totalTeams,
      paidUsers,
      conversionRate,
    },
  });
}
