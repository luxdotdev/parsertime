import { Separator } from "@/components/ui/separator";
import { ProfileForm } from "@/components/settings/profile-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import NoAuthCard from "@/components/auth/no-auth";
import { ImpersonateUserForm } from "@/components/admin/impersonate-user";
import { getUser } from "@/data/user-dto";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session.user.email);

  if (!user) {
    redirect("/sign-up");
  }

  if (user.role !== $Enums.UserRole.ADMIN) {
    return NoAuthCard();
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Admin Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage admin settings and preferences.
        </p>
      </div>
      <Separator />
      <ImpersonateUserForm />
    </div>
  );
}
