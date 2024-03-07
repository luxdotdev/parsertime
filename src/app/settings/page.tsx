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

export default async function SettingsProfilePage() {
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
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          This is how others will see you on the site.
        </p>
      </div>
      <Separator />
      <p>Your current plan is the {toTitleCase(user.billingPlan)} plan.</p>
      <Link
        href={user.billingPlan === "FREE" ? "/pricing" : billingPortalUrl}
        className="text-sky-500 underline"
      >
        {user.billingPlan === "FREE" ? (
          "Upgrade your plan"
        ) : (
          <span className="inline-flex items-center">
            Manage your subscription{" "}
            <ExternalLinkIcon className="w-4 h-4 ml-1" />
          </span>
        )}
      </Link>
      <ProfileForm user={user} />
    </div>
  );
}
