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
  BookOpenIcon,
  ChartColumnIcon,
  ChevronRightIcon,
  CrosshairIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  MailIcon,
  MapIcon,
  MedalIcon,
  MessageSquareIcon,
  PenLineIcon,
  SettingsIcon,
  ShuffleIcon,
  TagIcon,
  TerminalIcon,
  TrophyIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use } from "react";

// Route-active matchers carried over from the retired MainNav.
const STATS_PLAYER_ROUTE = /^\/stats\/(?!hero$|team$|map$|compare$)[^/]+$/;
const SCOUTING_TEAM_ROUTE = /^\/scouting\/(?!player$|team$)[^/]+$/;

type NavSubItem = {
  key: string;
  label: string;
  href: Route;
  isActive: boolean;
};

type NavLinkItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: Route;
  isActive: boolean;
};

type NavGroupItemData = {
  key: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  subItems: NavSubItem[];
};

type NavEntry = NavLinkItem | NavGroupItemData;

/**
 * The primary sidebar navigation: SCRIMS (the organized-play platform),
 * RANKED (the solo suite), and TOOLS (flag-gated utilities). Feature flags
 * are resolved by the server loader in `app-sidebar.tsx` and passed in as
 * props so this stays a plain client renderer.
 */
export function AppSidebarNav({
  scoutingEnabled,
  faceitScoutingEnabled,
  aiChatEnabled,
  dataToolsEnabled,
  tournamentEnabled,
  coachingCanvasEnabled,
  queryBuilderEnabled,
}: {
  scoutingEnabled: boolean;
  faceitScoutingEnabled: boolean;
  aiChatEnabled: boolean;
  dataToolsEnabled: boolean;
  tournamentEnabled: boolean;
  coachingCanvasEnabled: boolean;
  queryBuilderEnabled: boolean;
}) {
  const t = useTranslations("dashboard.mainNav");
  const tSidebar = useTranslations("dashboard.sidebar");
  const pathname = usePathname();
  const { teamId } = use(TeamSwitcherContext);

  const availabilityHref = (
    teamId !== undefined ? `/team/${teamId}/availability` : "/team"
  ) as Route;

  const scrimsItems: NavEntry[] = [
    {
      key: "dashboard",
      label: t("dashboard"),
      icon: LayoutDashboardIcon,
      href: "/dashboard",
      isActive: pathname === "/dashboard",
    },
    {
      key: "stats",
      label: t("stats"),
      icon: ChartColumnIcon,
      isActive: pathname.startsWith("/stats"),
      subItems: [
        {
          key: "player",
          label: t("playerStats"),
          href: "/stats",
          isActive: pathname === "/stats" || STATS_PLAYER_ROUTE.test(pathname),
        },
        {
          key: "hero",
          label: t("heroStats"),
          href: "/stats/hero",
          isActive: pathname.startsWith("/stats/hero"),
        },
        {
          key: "team",
          label: t("teamStats"),
          href: "/stats/team",
          isActive: pathname.startsWith("/stats/team"),
        },
        {
          key: "map",
          label: t("mapStats"),
          href: "/stats/map",
          isActive: pathname.startsWith("/stats/map"),
        },
        {
          key: "compare",
          label: t("compareStats"),
          href: "/stats/compare",
          isActive: pathname === "/stats/compare",
        },
      ],
    },
    {
      key: "teams",
      label: t("teams"),
      icon: UsersIcon,
      isActive: pathname.split("/")[1] === "team",
      subItems: [
        {
          key: "yourTeams",
          label: t("yourTeams"),
          href: "/team",
          isActive: pathname === "/team",
        },
        {
          key: "availability",
          label: t("availability"),
          href: availabilityHref,
          isActive: pathname.includes("/availability"),
        },
      ],
    },
    {
      key: "matchmaker",
      label: t("matchmaker"),
      icon: ShuffleIcon,
      href: "/matchmaker",
      isActive: pathname.startsWith("/matchmaker"),
    },
    {
      key: "leaderboard",
      label: t("leaderboard"),
      icon: TrophyIcon,
      href: "/leaderboard/csr",
      isActive: pathname.startsWith("/leaderboard"),
    },
  ];

  if (scoutingEnabled || faceitScoutingEnabled) {
    scrimsItems.push({
      key: "scouting",
      label: t("scouting"),
      icon: EyeIcon,
      isActive:
        pathname.startsWith("/scouting") || pathname.startsWith("/faceit"),
      subItems: [
        ...(scoutingEnabled
          ? [
              {
                key: "scoutTeam",
                label: t("scoutTeam"),
                href: "/scouting" as Route,
                isActive:
                  pathname === "/scouting" ||
                  SCOUTING_TEAM_ROUTE.test(pathname),
              },
              {
                key: "scoutPlayer",
                label: t("scoutPlayer"),
                href: "/scouting/player" as Route,
                isActive: pathname.startsWith("/scouting/player"),
              },
            ]
          : []),
        ...(faceitScoutingEnabled
          ? [
              {
                key: "faceitTeam",
                label: t("scoutFaceitTeam"),
                href: "/faceit" as Route,
                isActive:
                  pathname === "/faceit" || pathname.startsWith("/faceit/team"),
              },
              {
                key: "faceitPlayer",
                label: t("scoutFaceitPlayer"),
                href: "/faceit/player" as Route,
                isActive: pathname.startsWith("/faceit/player"),
              },
            ]
          : []),
      ],
    });
  }

  if (tournamentEnabled) {
    scrimsItems.push({
      key: "tournaments",
      label: t("tournaments"),
      icon: MedalIcon,
      href: "/tournaments" as Route,
      isActive: pathname.startsWith("/tournaments"),
    });
  }

  const rankedItems: NavEntry[] = [
    {
      key: "rankedTracker",
      label: tSidebar("rankedTracker"),
      icon: CrosshairIcon,
      href: "/ranked" as Route,
      isActive: pathname.startsWith("/ranked"),
    },
  ];

  const toolsItems: NavEntry[] = [
    ...(aiChatEnabled
      ? [
          {
            key: "chat",
            label: t("chat"),
            icon: MessageSquareIcon,
            href: "/chat" as Route,
            isActive: pathname.startsWith("/chat"),
          },
          {
            key: "reports",
            label: t("chatReports"),
            icon: FileTextIcon,
            href: "/reports" as Route,
            isActive: pathname.startsWith("/reports"),
          },
        ]
      : []),
    ...(queryBuilderEnabled
      ? [
          {
            key: "query",
            label: t("query"),
            icon: TerminalIcon,
            href: "/query" as Route,
            isActive: pathname.startsWith("/query"),
          },
        ]
      : []),
    ...(dataToolsEnabled
      ? [
          {
            key: "dataLabeling",
            label: t("dataLabeling"),
            icon: TagIcon,
            href: "/data-labeling" as Route,
            isActive: pathname.startsWith("/data-labeling"),
          },
          {
            key: "mapCalibration",
            label: t("mapCalibration"),
            icon: MapIcon,
            href: "/map-calibration" as Route,
            isActive: pathname.startsWith("/map-calibration"),
          },
        ]
      : []),
    ...(coachingCanvasEnabled
      ? [
          {
            key: "coachingCanvas",
            label: t("coachingCanvas"),
            icon: PenLineIcon,
            href: "/coaching/canvas" as Route,
            isActive: pathname.startsWith("/coaching"),
          },
        ]
      : []),
  ];

  return (
    <>
      <NavSection label={tSidebar("sections.scrims")} items={scrimsItems} />
      <RailSectionBreak />
      <NavSection label={tSidebar("sections.ranked")} items={rankedItems} />
      {toolsItems.length > 0 && (
        <>
          <RailSectionBreak />
          <NavSection label={tSidebar("sections.tools")} items={toolsItems} />
        </>
      )}
    </>
  );
}

/**
 * Pinned footer links: Settings, Contact, and the external docs site.
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
  const t = useTranslations("dashboard.mainNav");
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={activePath?.startsWith("/settings") ?? false}
          tooltip={t("settings")}
          className="data-active:text-sidebar-primary"
        >
          <Link href="/settings" onClick={closeMobileSidebar}>
            <SettingsIcon />
            <span>{t("settings")}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={activePath?.startsWith("/contact") ?? false}
          tooltip={t("contact")}
          className="data-active:text-sidebar-primary"
        >
          <Link href="/contact" onClick={closeMobileSidebar}>
            <MailIcon />
            <span>{t("contact")}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={t("docs")}>
          <a
            href="https://docs.parsertime.app"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpenIcon />
            <span>{t("docs")}</span>
            <ExternalLinkIcon className="ml-auto opacity-60" />
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
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

function NavSection({ label, items }: { label: string; items: NavEntry[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-mono text-[10px] tracking-[0.16em] uppercase">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) =>
            "subItems" in item ? (
              <NavGroup key={item.key} item={item} />
            ) : (
              <NavLink key={item.key} item={item} />
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function NavLink({ item }: { item: NavLinkItem }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={item.isActive}
        tooltip={item.label}
        className="data-active:text-sidebar-primary"
      >
        <Link
          href={item.href}
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          <item.icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavGroup({ item }: { item: NavGroupItemData }) {
  const { isMobile, setOpen, setOpenMobile, state } = useSidebar();

  return (
    <Collapsible
      asChild
      defaultOpen={item.isActive}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.label}
            onClick={() => {
              // In the icon rail the submenu is hidden, so a group click
              // expands the sidebar (with the group opening) instead of
              // toggling something invisible.
              if (state === "collapsed" && !isMobile) setOpen(true);
            }}
          >
            <item.icon />
            <span>{item.label}</span>
            <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.subItems.map((sub) => (
              <SidebarMenuSubItem key={sub.key}>
                <SidebarMenuSubButton
                  asChild
                  isActive={sub.isActive}
                  className="data-active:text-sidebar-primary"
                >
                  <Link
                    href={sub.href}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                  >
                    <span>{sub.label}</span>
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
