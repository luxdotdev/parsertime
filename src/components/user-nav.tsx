import { SignOutButton } from "@/components/auth/auth-components";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/auth";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { redirect } from "next/navigation";
import { $Enums } from "@prisma/client";
import { getUser } from "@/data/user-dto";
import { getTranslations } from "next-intl/server";

export async function UserNav() {
  const t = await getTranslations("dashboard");
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await getUser(session?.user?.email);

  const isAdmin = user?.role === $Enums.UserRole.ADMIN;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                session?.user?.image ||
                `https://avatar.vercel.sh/${session?.user?.name}.png`
              }
              alt={session?.user?.name || "User"}
            />
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session?.user?.name || ""}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session?.user?.email || ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard">
            <DropdownMenuItem>
              {/* Dashboard */}
              {t("userNav.dashboard")}
            </DropdownMenuItem>
          </Link>
          <Link href="/team">
            <DropdownMenuItem>
              {/* Teams */}
              {t("userNav.teams")}
            </DropdownMenuItem>
          </Link>
          <Link href="/settings">
            <DropdownMenuItem>
              {/* Settings */}
              {t("userNav.settings")}
            </DropdownMenuItem>
          </Link>
          <Link href="/contact">
            <DropdownMenuItem>
              {/* Contact */}
              {t("userNav.contact")}
            </DropdownMenuItem>
          </Link>
          <Link href="https://docs.parsertime.app" target="_blank">
            <DropdownMenuItem>
              {/* Docs */}
              {t("userNav.docs")}
              <DropdownMenuShortcut>
                <ExternalLinkIcon />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <Link href="/settings/admin">
              <DropdownMenuItem>
                {/* Admin */}
                {t("userNav.admin")}
              </DropdownMenuItem>
            </Link>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <SignOutButton />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
