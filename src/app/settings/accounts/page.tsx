import { DiscordSettingsForm } from "@/components/settings/discord-form";
import { Separator } from "@/components/ui/separator";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { DiscordLoginButton } from "@/components/settings/discord-login-button";

export default async function LinkedAccountSettingsPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session.user.email);

  if (!user) {
    redirect("/sign-up");
  }

  const accounts = await prisma.account.findMany({
    where: {
      userId: user.id,
    },
  });

  const discordAccount = accounts.find(
    (account) => account.provider === "discord"
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Linked Accounts</h3>
        <p className="text-sm text-muted-foreground">
          Manage linked account settings and preferences.
        </p>
      </div>
      <Separator />
      {discordAccount ? (
        <p>Your Discord account is successfully linked.</p>
      ) : (
        <DiscordLoginButton />
      )}
    </div>
  );
}
