import { Separator } from "@/components/ui/separator";
import { ProfileForm } from "@/components/settings/profile-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function SettingsProfilePage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email ?? "",
    },
  });

  if (!user) {
    redirect("/sign-up");
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          This is how others will see you on the site.
        </p>
      </div>
      <Separator />
      <ProfileForm user={user} />
    </div>
  );
}
