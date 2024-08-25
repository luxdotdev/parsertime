import { Separator } from "@/components/ui/separator";
import { ProfileForm } from "@/components/settings/profile-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { toTitleCase } from "@/lib/utils";
import Link from "next/link";
import { getCustomerPortalUrl } from "@/lib/stripe";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { getUser } from "@/data/user-dto";
import { DangerZone } from "@/components/settings/danger-zone";
import { getTranslations } from "next-intl/server";

export default async function SettingsProfilePage() {
  const t = await getTranslations("settingsPage");
  const session = await auth();
  if (!session || !session.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session.user.email);

  if (!user) {
    redirect("/sign-up");
  }

  const billingPortalUrl = await getCustomerPortalUrl(user);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("profile.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("profile.description")}
        </p>
      </div>
      <Separator />
      <p>
        {t("profile.planDescription", {
          billingPlan: t(`profile.billingPlan.${user.billingPlan}`),
        })}
      </p>
      <Link
        href={user.billingPlan === "FREE" ? "/pricing" : billingPortalUrl}
        className="text-sky-500 underline"
      >
        {user.billingPlan === "FREE" ? (
          t("profile.planUpgrade")
        ) : (
          <span className="inline-flex items-center">
            {t("profile.manageSubscription")}{" "}
            <ExternalLinkIcon className="ml-1 h-4 w-4" />
          </span>
        )}
      </Link>
      <ProfileForm user={user} />
      <div className="p-1" />
      <DangerZone url={billingPortalUrl} />
    </div>
  );
}
