import {
  AppSidebarFooterNav,
  AppSidebarNav,
} from "@/components/app-sidebar-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";

/**
 * The app sidebar. The whole thing is static chrome that prerenders with the
 * page shell: the primary nav reads feature flags from the root layout's
 * persistent `FeatureFlagsProvider` (see `AppSidebarNav`), so a remounted
 * sidebar — every cross-shell navigation mounts a fresh one — paints
 * synchronously instead of streaming a skeleton.
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
                <span className="font-semibold">Sightline</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <AppSidebarNav />
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t">
        <AppSidebarFooterNav />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
