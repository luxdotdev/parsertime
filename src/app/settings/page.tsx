import { DangerZone } from "@/components/settings/danger-zone";
import { ProfileForm } from "@/components/settings/profile-form";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { getCustomerPortalUrl } from "@/lib/stripe";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { Route } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SettingsProfilePage() {
  const t = await getTranslations("settingsPage.profile");

  const session = await auth();
  if (!session || !session.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session.user.email);

  if (!user) {
    redirect("/sign-up");
  }

  const billingPortalUrl = (await getCustomerPortalUrl(user)) as Route;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <Separator />
      <p>
        {t("planDescription", {
          billingPlan: t(`billingPlan.${user.billingPlan}`),
        })}
      </p>
      <Link
        href={user.billingPlan === "FREE" ? "/pricing" : billingPortalUrl}
        className="text-sky-500 underline"
      >
        {user.billingPlan === "FREE" ? (
          t("planUpgrade")
        ) : (
          <span className="inline-flex items-center">
            {t("manageSubscription")}{" "}
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
