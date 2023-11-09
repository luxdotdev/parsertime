"use client";

import PlayerSwitcher, {
  SelectedPlayerContext,
} from "@/components/dashboard/player-switcher";
import { MainNav } from "@/components/dashboard/main-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModeToggle } from "@/components/theme-switcher";
import { DefaultOverview } from "@/components/dashboard/default-overview";
import { useContext } from "react";
import { PlayerOverview } from "@/components/dashboard/player-overview";
import { UserNav } from "@/components/dashboard/user-nav";
import { Search } from "@/components/dashboard/search";

export default function DashboardPage() {
  const { selectedPlayer } = useContext(SelectedPlayerContext);

  return (
    <>
      <div className="hidden flex-col md:flex">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <PlayerSwitcher />
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">{`
            ${
              selectedPlayer.value === "default"
                ? ""
                : selectedPlayer.label +
                  `'${
                    selectedPlayer.label[selectedPlayer.label.length - 1] ===
                    "s"
                      ? ""
                      : "s"
                  } `
            }
            Dashboard`}</h2>
          </div>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              {selectedPlayer.value === "default" ? (
                <DefaultOverview />
              ) : (
                <PlayerOverview />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
