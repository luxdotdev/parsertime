import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { ModeToggle } from "@/components/theme-switcher";
import { UserNav } from "@/components/user-nav";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Footer from "@/components/footer";
import { MobileNav } from "@/components/mobile-nav";
import { getUser } from "@/data/user-dto";
import { WorkshopCode } from "@/components/workshop-code";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  const user = await getUser(session?.user?.email);

  return (
    <>
      <div className="min-h-[90vh] flex-col md:flex">
        <div className="border-b">
          <div className="hidden h-16 items-center px-4 md:flex">
            <TeamSwitcher session={session} />
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <WorkshopCode />
              <Search user={user} />
              <ModeToggle />
              <UserNav />
            </div>
          </div>
          <div className="flex h-16 items-center px-4 md:hidden">
            <MobileNav session={session} />
            <div className="ml-auto flex items-center space-x-4">
              <ModeToggle />
              <UserNav />
            </div>
          </div>
        </div>
        {children}
      </div>
      <Footer />
    </>
  );
}
