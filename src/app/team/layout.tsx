import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { ModeToggle } from "@/components/theme-switcher";
import { UserNav } from "@/components/user-nav";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Footer from "@/components/footer";
import { MobileNav } from "@/components/mobile-nav";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <>
      <div className="flex-col md:flex min-h-[90vh]">
        <div className="border-b">
          <div className="hidden md:flex h-16 items-center px-4">
            <TeamSwitcher session={session} />
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <ModeToggle />
              <UserNav />
            </div>
          </div>
          <div className="flex md:hidden h-16 items-center px-4">
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
