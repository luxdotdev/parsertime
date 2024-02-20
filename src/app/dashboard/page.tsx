import { AdminScrimView } from "@/components/dashboard/admin-scrim-view";
import { ScrimList } from "@/components/dashboard/scrim-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SearchParams } from "@/types/next";
import { $Enums } from "@prisma/client";
import { Metadata } from "next";

type Props = {
  searchParams: SearchParams;
};

export const metadata: Metadata = {
  title: "Dashboard | Parsertime",
  description: "Parsertime is a tool for analyzing Overwatch scrims.",
  openGraph: {
    title: `Dashboard | Parsertime`,
    description: `Parsertime is a tool for analyzing Overwatch scrims.`,
    url: "https://parsertime.app",
    type: "website",
    siteName: "Parsertime",
    images: [
      {
        url: `https://parsertime.app/api/og?title=Dashboard`,
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
  },
};

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth();

  const userData = await getUser(session?.user?.email);

  const isAdmin = userData?.role === $Enums.UserRole.ADMIN;

  return (
    <>
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
            <ScrimList searchParams={searchParams} />
          </TabsContent>
          <TabsContent value="admin" className="space-y-4">
            <AdminScrimView />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
