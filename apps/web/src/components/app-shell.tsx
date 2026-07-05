import { AppSidebar } from "@/components/app-sidebar";
import { SidebarStateSync } from "@/components/sidebar-state-sync";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { ReactNode } from "react";

/**
 * The authed app frame: sidebar + a content column that holds the page's top
 * bar, content, and footer. Everything here is static chrome — the sidebar's
 * nav and the header stream behind their own Suspense boundaries — so any
 * route using this shell paints instantly.
 *
 * The content column intentionally mirrors `SidebarInset` as a `div`: pages
 * render their own `<main id="main-content">`, and nesting mains is invalid.
 */
export function AppShell({
  header,
  children,
}: {
  /** The route's top bar, typically Suspense-wrapped (auth-derived). */
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <SidebarStateSync />
      <AppSidebar />
      <div
        data-slot="sidebar-inset"
        className="bg-background relative flex min-h-svh w-full min-w-0 flex-1 flex-col"
      >
        {header}
        {children}
      </div>
    </SidebarProvider>
  );
}
