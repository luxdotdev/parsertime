import { UsageCard } from "@/components/settings/usage-card";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCustomerPortalUrl } from "@/lib/stripe";
import type { Route } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function SettingsBillingPage() {
  const t = await getTranslations("settingsPage.billing");

  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const user = await getUser(session?.user?.email);
  if (!user) redirect("/sign-up");

  const billingPortalUrl = (await getCustomerPortalUrl(user)) as Route;

  const teamCount = await prisma.team.count({
    where: {
      ownerId: user.id,
    },
  });

  const scrims = await prisma.scrim.findMany({
    where: {
      creatorId: user.id,
    },
  });
  const scrimCount = scrims.length;

  const teams = await prisma.team.findMany({
    where: {
      ownerId: user.id,
    },
    select: {
      users: true,
    },
  });

  const teamMemberCount = teams.reduce(
    (acc, team) => acc + team.users.length,
    0
  );

  return (
    <section>
      <div>
        <h3 className="text-lg font-medium">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <Separator className="my-6" />
      <UsageCard
        manageSubscriptionUrl={billingPortalUrl}
        billingPlan={user.billingPlan}
        teamCount={teamCount}
        scrimCount={scrimCount}
        teamMemberCount={teamMemberCount}
      />
    </section>
  );
}
