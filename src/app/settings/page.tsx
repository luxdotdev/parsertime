import { DangerZone } from "@/components/settings/danger-zone";
import { ProfileForm } from "@/components/settings/profile-form";
import { Separator } from "@/components/ui/separator";
import { getAppSettings, getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCustomerPortalUrl } from "@/lib/stripe";
import type { Route } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function SettingsProfilePage() {
  const t = await getTranslations("settingsPage.profile");

  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session.user.email);

  if (!user) {
    redirect("/sign-up");
  }

  const appSettings = await getAppSettings(session.user.email);
  const billingPortalUrl = (await getCustomerPortalUrl(user)) as Route;

  const appliedTitle = await prisma.appliedTitle.findFirst({
    where: {
      userId: user.id,
    },
  });

  return (
    <div className="space-y-6 lg:max-w-2xl">
      <div>
        <h3 className="text-lg font-medium">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <Separator />
      <ProfileForm
        user={user}
        appSettings={appSettings}
        appliedTitle={appliedTitle}
      />
      <DangerZone url={billingPortalUrl} />
    </div>
  );
}
