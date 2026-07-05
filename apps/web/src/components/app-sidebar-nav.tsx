"use client";

import { TeamSwitcherContext } from "@/components/team-switcher-provider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  FOOTER_SCHEMA,
  NAV_SCHEMA,
  type FindContext,
  type NavGroup as NavGroupData,
  type NavLeaf,
} from "@/lib/find/schema";
import type { FeatureFlags } from "@/lib/flags-helpers";
import { ChevronRightIcon, ExternalLinkIcon } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use } from "react";

/**
 * The primary sidebar navigation: SCRIMS (the organized-play platform),
 * RANKED (the solo suite), and TOOLS (flag-gated utilities). The structure
 * comes from the shared nav schema (`@/lib/find/schema`) — the same source
 * Find searches — so the two surfaces can never drift. Feature flags are
 * resolved by the server loader in `app-sidebar.tsx` and passed in as props
 * so this stays a plain client renderer.
 */
export function AppSidebarNav({ flags }: { flags: Partial<FeatureFlags> }) {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const { teamId } = use(TeamSwitcherContext);
  const ctx: FindContext = { teamId };

  return (
    <>
      {NAV_SCHEMA.map((section, i) => {
        const entries = section.entries
          .map((entry) =>
            entry.kind === "group"
              ? {
                  ...entry,
                  children: entry.children.filter(
                    (child) => !child.flag || flags[child.flag]
                  ),
                }
              : entry
          )
          .filter((entry) =>
            entry.kind === "group"
              ? entry.children.length > 0
              : !entry.flag || flags[entry.flag]
          );
        if (entries.length === 0) return null;

        return (
          <div key={section.id} className="contents">
            {i > 0 && <RailSectionBreak />}
            <SidebarGroup>
              <SidebarGroupLabel className="font-mono text-[10px] tracking-[0.16em] uppercase">
                {t(section.labelKey)}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {entries.map((entry) =>
                    entry.kind === "group" ? (
                      <NavGroup
                        key={entry.id}
                        item={entry}
                        pathname={pathname}
                        ctx={ctx}
                      />
                    ) : (
                      <NavLink
                        key={entry.id}
                        item={entry}
                        pathname={pathname}
                        ctx={ctx}
                      />
                    )
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        );
      })}
    </>
  );
}

function leafHref(leaf: NavLeaf, ctx: FindContext): Route {
  return typeof leaf.href === "function" ? leaf.href(ctx) : leaf.href;
}

/**
 * Pinned footer links: Settings, Contact, and the external docs site —
 * rendered from the schema's footer entries.
 *
 * `usePathname()` is URL data, so the active-state variant must live behind a
 * Suspense boundary on dynamic routes (E1316); the fallback renders the same
 * items without active state so nothing visibly changes when it resolves.
 */
export function AppSidebarFooterNav() {
  return (
    <Suspense fallback={<FooterMenu activePath={null} />}>
      <ActiveFooterMenu />
    </Suspense>
  );
}

function ActiveFooterMenu() {
  const pathname = usePathname();
  return <FooterMenu activePath={pathname} />;
}

function FooterMenu({ activePath }: { activePath: string | null }) {
  const t = useTranslations("dashboard");
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <SidebarMenu>
      {FOOTER_SCHEMA.map((leaf) => {
        const label = t(leaf.labelKey);
        const isActive =
          activePath !== null && (leaf.isActive?.(activePath) ?? false);

        return (
          <SidebarMenuItem key={leaf.id}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={label}
              className="data-active:text-sidebar-primary"
            >
              {leaf.external ? (
                <a href={leaf.href as string} target="_blank" rel="noreferrer">
                  {leaf.icon && <leaf.icon />}
                  <span>{label}</span>
                  <ExternalLinkIcon className="ml-auto opacity-60" />
                </a>
              ) : (
                <Link
                  href={leafHref(leaf, {})}
                  onClick={closeMobileSidebar}
                >
                  {leaf.icon && <leaf.icon />}
                  <span>{label}</span>
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

// In the expanded sidebar the mono section labels separate the groups; in the
// icon rail those labels are hidden, so a hairline stands in for them.
function RailSectionBreak() {
  return (
    <SidebarSeparator className="mx-2 hidden group-data-[collapsible=icon]:block" />
  );
}

function NavLink({
  item,
  pathname,
  ctx,
}: {
  item: NavLeaf;
  pathname: string;
  ctx: FindContext;
}) {
  const t = useTranslations("dashboard");
  const { isMobile, setOpenMobile } = useSidebar();
  const label = t(item.labelKey);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={item.isActive?.(pathname) ?? false}
        tooltip={label}
        className="data-active:text-sidebar-primary"
      >
        <Link
          href={leafHref(item, ctx)}
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          {item.icon && <item.icon />}
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavGroup({
  item,
  pathname,
  ctx,
}: {
  item: NavGroupData & { children: NavLeaf[] };
  pathname: string;
  ctx: FindContext;
}) {
  const t = useTranslations("dashboard");
  const { isMobile, setOpen, setOpenMobile, state } = useSidebar();
  const label = t(item.labelKey);

  return (
    <Collapsible
      asChild
      defaultOpen={item.isActive?.(pathname) ?? false}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={label}
            onClick={() => {
              // In the icon rail the submenu is hidden, so a group click
              // expands the sidebar (with the group opening) instead of
              // toggling something invisible.
              if (state === "collapsed" && !isMobile) setOpen(true);
            }}
          >
            <item.icon />
            <span>{label}</span>
            <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((sub) => (
              <SidebarMenuSubItem key={sub.id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={sub.isActive?.(pathname) ?? false}
                  className="data-active:text-sidebar-primary"
                >
                  <Link
                    href={leafHref(sub, ctx)}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                  >
                    <span>{t(sub.labelKey)}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
