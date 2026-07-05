import {
  AppSidebarFooterNav,
  AppSidebarNav,
} from "@/components/app-sidebar-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  aiChat,
  coachingCanvas,
  dataLabeling,
  faceitScouting,
  queryBuilder,
  scoutingTool,
  tournament,
} from "@/lib/flags";
import { getFlag } from "@/lib/flags-helpers";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

/**
 * The app sidebar. The frame (logo header, footer links, rail) is static
 * chrome and prerenders with the page shell; the primary nav needs the
 * request's feature flags, so it streams in behind its own Suspense boundary.
 */
export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <Image
                  src="/parsertime.png"
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 dark:invert"
                />
                <span className="font-semibold">Parsertime</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <Suspense fallback={<AppSidebarNavSkeleton />}>
          <AppSidebarNavLoader />
        </Suspense>
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t">
        <AppSidebarFooterNav />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

async function AppSidebarNavLoader() {
  // Feature flags compile to `use cache` reads; this component always streams
  // behind its Suspense boundary, so mark it request-time up front (same
  // pattern as AuthedAppHeader) to keep the static shell request-free.
  await connection();

  const [
    scoutingEnabled,
    faceitScoutingEnabled,
    aiChatEnabled,
    dataToolsEnabled,
    tournamentEnabled,
    coachingCanvasEnabled,
    queryBuilderEnabled,
  ] = await Promise.all([
    getFlag(scoutingTool),
    getFlag(faceitScouting),
    getFlag(aiChat),
    getFlag(dataLabeling),
    getFlag(tournament),
    getFlag(coachingCanvas),
    getFlag(queryBuilder),
  ]);

  return (
    <AppSidebarNav
      scoutingEnabled={scoutingEnabled}
      faceitScoutingEnabled={faceitScoutingEnabled}
      aiChatEnabled={aiChatEnabled}
      dataToolsEnabled={dataToolsEnabled}
      tournamentEnabled={tournamentEnabled}
      coachingCanvasEnabled={coachingCanvasEnabled}
      queryBuilderEnabled={queryBuilderEnabled}
    />
  );
}

// Mirrors the streamed nav's shape (three labeled groups of rows) so the
// sidebar doesn't jump when the real nav arrives.
function AppSidebarNavSkeleton() {
  return (
    <>
      <NavGroupSkeleton rows={6} />
      <NavGroupSkeleton rows={1} />
      <NavGroupSkeleton rows={3} />
    </>
  );
}

function NavGroupSkeleton({ rows }: { rows: number }) {
  return (
    <SidebarGroup>
      <div className="flex h-8 items-center px-2 group-data-[collapsible=icon]:hidden">
        <Skeleton className="h-3 w-16" />
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          {Array.from({ length: rows }, (_, i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
