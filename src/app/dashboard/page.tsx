import { ScrimList } from "@/components/dashboard/scrim-list";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { MainNav } from "@/components/dashboard/main-nav";
import { Search } from "@/components/dashboard/search";
import { UserNav } from "@/components/user-nav";
import { ModeToggle } from "@/components/theme-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import { $Enums } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AdminScrimView } from "@/components/dashboard/admin-scrim-view";

export default async function DashboardPage() {
  const session = await auth();

  const userData = await prisma.user.findFirst({
    where: {
      email: session?.user?.email,
    },
  });

  const isAdmin = userData?.role === $Enums.UserRole.ADMIN;

  return (
    <>
      <div className="hidden flex-col md:flex">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <TeamSwitcher session={session} />
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <ModeToggle />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          </div>
          <Tabs defaultValue="overview" className="space-y-4">
            {isAdmin && (
              <TabsList>
                <TabsTrigger value="overview">Your Scrims</TabsTrigger>
                <TabsTrigger value="admin">Admin View</TabsTrigger>
              </TabsList>
            )}
            <TabsContent value="overview" className="space-y-4">
              <ScrimList />
            </TabsContent>
            <TabsContent value="admin" className="space-y-4">
              <AdminScrimView />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
