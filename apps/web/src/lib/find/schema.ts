import type { FeatureFlags } from "@/lib/flags-helpers";
import { DOCS_URL } from "@/lib/site";
import {
  BookOpenIcon,
  BugIcon,
  ChartColumnIcon,
  CreditCardIcon,
  CrosshairIcon,
  EyeIcon,
  FileTextIcon,
  HomeIcon,
  LanguagesIcon,
  LaptopIcon,
  LayoutDashboardIcon,
  LinkIcon,
  LogInIcon,
  MailIcon,
  MapIcon,
  MedalIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  MoonIcon,
  PenLineIcon,
  SettingsIcon,
  Share2Icon,
  ShuffleIcon,
  SunIcon,
  TagIcon,
  TerminalIcon,
  TrophyIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";

/**
 * The navigation schema: the single source of truth for every destination in
 * the app. The sidebar (`AppSidebarNav`) renders it, and Find (the ⌘K search)
 * flattens it, so a route added or flag-gated here shows up in both surfaces
 * at once — they can never drift.
 *
 * Label keys are relative to the `dashboard` i18n namespace. Aliases are
 * additional (English) match words for Find; the localized label is always
 * matched too.
 */

export type FindContext = {
  /** The active team from the team switcher, if any. */
  teamId?: number;
};

export type NavLeaf = {
  kind: "page";
  id: string;
  labelKey: string;
  icon?: LucideIcon;
  aliases?: readonly string[];
  href: Route | ((ctx: FindContext) => Route);
  external?: boolean;
  flag?: keyof FeatureFlags;
  requiresAuth?: boolean;
  /** Builds a team-scoped variant of this destination for combined queries
   * ("faze trends" → /stats/team/3/trends). */
  teamHref?: (teamId: number) => Route;
  /** Builds a player-scoped variant ("ana stats" → /stats/ana). */
  playerHref?: (playerName: string) => Route;
  isActive?: (pathname: string) => boolean;
};

export type NavGroup = {
  kind: "group";
  id: string;
  labelKey: string;
  icon: LucideIcon;
  isActive?: (pathname: string) => boolean;
  children: NavLeaf[];
};

export type NavEntry = NavLeaf | NavGroup;

export type NavSection = {
  id: "scrims" | "ranked" | "tools";
  labelKey: string;
  entries: NavEntry[];
};

// Route-active matchers carried over from the retired MainNav.
const STATS_PLAYER_ROUTE = /^\/stats\/(?!hero$|team$|map$|compare$)[^/]+$/;
const SCOUTING_TEAM_ROUTE = /^\/scouting\/(?!player$|team$)[^/]+$/;

export const NAV_SCHEMA: NavSection[] = [
  {
    id: "scrims",
    labelKey: "sidebar.sections.scrims",
    entries: [
      {
        kind: "page",
        id: "dashboard",
        labelKey: "mainNav.dashboard",
        icon: LayoutDashboardIcon,
        aliases: ["scrims", "home", "overview"],
        href: "/dashboard",
        requiresAuth: true,
        teamHref: (teamId) => `/dashboard?team=${teamId}` as Route,
        isActive: (p) => p === "/dashboard",
      },
      {
        kind: "group",
        id: "stats",
        labelKey: "mainNav.stats",
        icon: ChartColumnIcon,
        isActive: (p) => p.startsWith("/stats"),
        children: [
          {
            kind: "page",
            id: "stats-player",
            labelKey: "mainNav.playerStats",
            aliases: ["player", "csr", "rating"],
            href: "/stats",
            playerHref: (name) => `/stats/${encodeURIComponent(name)}` as Route,
            isActive: (p) => p === "/stats" || STATS_PLAYER_ROUTE.test(p),
          },
          {
            kind: "page",
            id: "stats-hero",
            labelKey: "mainNav.heroStats",
            aliases: ["hero", "heroes"],
            href: "/stats/hero",
            isActive: (p) => p.startsWith("/stats/hero"),
          },
          {
            kind: "page",
            id: "stats-team",
            labelKey: "mainNav.teamStats",
            aliases: ["team"],
            href: "/stats/team",
            teamHref: (teamId) => `/stats/team/${teamId}` as Route,
            isActive: (p) => p.startsWith("/stats/team"),
          },
          {
            kind: "page",
            id: "stats-map",
            labelKey: "mainNav.mapStats",
            aliases: ["map", "maps"],
            href: "/stats/map",
            isActive: (p) => p.startsWith("/stats/map"),
          },
          {
            kind: "page",
            id: "stats-compare",
            labelKey: "mainNav.compareStats",
            aliases: ["compare", "versus"],
            href: "/stats/compare",
            isActive: (p) => p === "/stats/compare",
          },
        ],
      },
      {
        kind: "group",
        id: "teams",
        labelKey: "mainNav.teams",
        icon: UsersIcon,
        isActive: (p) => p.split("/")[1] === "team",
        children: [
          {
            kind: "page",
            id: "teams-list",
            labelKey: "mainNav.yourTeams",
            aliases: ["teams", "roster"],
            href: "/team",
            requiresAuth: true,
            isActive: (p) => p === "/team",
          },
          {
            kind: "page",
            id: "teams-availability",
            labelKey: "mainNav.availability",
            aliases: ["schedule", "calendar"],
            href: (ctx) =>
              (ctx.teamId !== undefined
                ? `/team/${ctx.teamId}/availability`
                : "/team") as Route,
            requiresAuth: true,
            teamHref: (teamId) => `/team/${teamId}/availability` as Route,
            isActive: (p) => p.includes("/availability"),
          },
        ],
      },
      {
        kind: "page",
        id: "matchmaker",
        labelKey: "mainNav.matchmaker",
        icon: ShuffleIcon,
        aliases: ["find scrim", "lfs"],
        href: "/matchmaker",
        requiresAuth: true,
        teamHref: (teamId) => `/matchmaker/${teamId}` as Route,
        isActive: (p) => p.startsWith("/matchmaker"),
      },
      {
        kind: "page",
        id: "leaderboard",
        labelKey: "mainNav.leaderboard",
        icon: TrophyIcon,
        aliases: ["rankings", "top", "csr", "tsr"],
        href: "/leaderboard/csr",
        isActive: (p) => p.startsWith("/leaderboard"),
      },
      {
        kind: "group",
        id: "scouting",
        labelKey: "mainNav.scouting",
        icon: EyeIcon,
        isActive: (p) => p.startsWith("/scouting") || p.startsWith("/faceit"),
        children: [
          {
            kind: "page",
            id: "scouting-team",
            labelKey: "mainNav.scoutTeam",
            aliases: ["owcs"],
            href: "/scouting" as Route,
            flag: "scoutingEnabled",
            isActive: (p) => p === "/scouting" || SCOUTING_TEAM_ROUTE.test(p),
          },
          {
            kind: "page",
            id: "scouting-player",
            labelKey: "mainNav.scoutPlayer",
            aliases: ["owcs"],
            href: "/scouting/player" as Route,
            flag: "scoutingEnabled",
            isActive: (p) => p.startsWith("/scouting/player"),
          },
          {
            kind: "page",
            id: "faceit-team",
            labelKey: "mainNav.scoutFaceitTeam",
            aliases: ["faceit"],
            href: "/faceit" as Route,
            flag: "faceitScoutingEnabled",
            isActive: (p) => p === "/faceit" || p.startsWith("/faceit/team"),
          },
          {
            kind: "page",
            id: "faceit-player",
            labelKey: "mainNav.scoutFaceitPlayer",
            aliases: ["faceit"],
            href: "/faceit/player" as Route,
            flag: "faceitScoutingEnabled",
            isActive: (p) => p.startsWith("/faceit/player"),
          },
        ],
      },
      {
        kind: "page",
        id: "tournaments",
        labelKey: "mainNav.tournaments",
        icon: MedalIcon,
        aliases: ["bracket", "events"],
        href: "/tournaments" as Route,
        flag: "tournamentEnabled",
        isActive: (p) => p.startsWith("/tournaments"),
      },
    ],
  },
  {
    id: "ranked",
    labelKey: "sidebar.sections.ranked",
    entries: [
      {
        kind: "page",
        id: "ranked-tracker",
        labelKey: "sidebar.rankedTracker",
        icon: CrosshairIcon,
        aliases: ["ranked", "competitive", "winrate"],
        href: "/ranked" as Route,
        isActive: (p) => p.startsWith("/ranked"),
      },
    ],
  },
  {
    id: "tools",
    labelKey: "sidebar.sections.tools",
    entries: [
      {
        kind: "page",
        id: "chat",
        labelKey: "mainNav.chat",
        icon: MessageSquareIcon,
        aliases: ["ai", "chat", "assistant"],
        href: "/chat" as Route,
        flag: "aiChatEnabled",
        requiresAuth: true,
        isActive: (p) => p.startsWith("/chat"),
      },
      {
        kind: "page",
        id: "reports",
        labelKey: "mainNav.chatReports",
        icon: FileTextIcon,
        aliases: ["ai reports"],
        href: "/reports" as Route,
        flag: "aiChatEnabled",
        requiresAuth: true,
        isActive: (p) => p.startsWith("/reports"),
      },
      {
        kind: "page",
        id: "query",
        labelKey: "mainNav.query",
        icon: TerminalIcon,
        aliases: ["sql", "builder"],
        href: "/query" as Route,
        flag: "queryBuilderEnabled",
        requiresAuth: true,
        isActive: (p) => p.startsWith("/query"),
      },
      {
        kind: "page",
        id: "data-labeling",
        labelKey: "mainNav.dataLabeling",
        icon: TagIcon,
        href: "/data-labeling" as Route,
        flag: "dataLabelingEnabled",
        requiresAuth: true,
        isActive: (p) => p.startsWith("/data-labeling"),
      },
      {
        kind: "page",
        id: "map-calibration",
        labelKey: "mainNav.mapCalibration",
        icon: MapIcon,
        href: "/map-calibration" as Route,
        flag: "dataLabelingEnabled",
        requiresAuth: true,
        isActive: (p) => p.startsWith("/map-calibration"),
      },
      {
        kind: "page",
        id: "coaching-canvas",
        labelKey: "mainNav.coachingCanvas",
        icon: PenLineIcon,
        aliases: ["whiteboard", "draw"],
        href: "/coaching/canvas" as Route,
        flag: "coachingCanvasEnabled",
        requiresAuth: true,
        isActive: (p) => p.startsWith("/coaching"),
      },
    ],
  },
];

/** Pinned footer links (Settings, Contact, Docs) — also rendered from the
 * schema so Find stays in sync with them. */
export const FOOTER_SCHEMA: NavLeaf[] = [
  {
    kind: "page",
    id: "settings",
    labelKey: "mainNav.settings",
    icon: SettingsIcon,
    aliases: ["profile", "preferences", "account"],
    href: "/settings",
    requiresAuth: true,
    isActive: (p) => p.startsWith("/settings"),
  },
  {
    kind: "page",
    id: "contact",
    labelKey: "mainNav.contact",
    icon: MailIcon,
    aliases: ["support", "help", "email"],
    href: "/contact",
    isActive: (p) => p.startsWith("/contact"),
  },
  {
    kind: "page",
    id: "docs",
    labelKey: "mainNav.docs",
    icon: BookOpenIcon,
    aliases: ["documentation", "guide", "manual"],
    href: DOCS_URL as Route,
    external: true,
  },
];

/**
 * Destinations reachable through Find but not listed in the sidebar:
 * settings subpages and the team-stats dimensions (which make combined
 * queries like "faze trends" land on /stats/team/3/trends).
 */
export const FIND_ONLY_PAGES: NavLeaf[] = [
  {
    kind: "page",
    id: "settings-accounts",
    labelKey: "find.pages.linkedAccounts",
    icon: LinkIcon,
    aliases: ["integrations", "discord", "battlenet", "faceit", "linked"],
    href: "/settings/accounts" as Route,
    requiresAuth: true,
  },
  {
    kind: "page",
    id: "settings-billing",
    labelKey: "find.pages.billing",
    icon: CreditCardIcon,
    aliases: ["plan", "subscription", "invoice", "payment"],
    href: "/settings/billing" as Route,
    requiresAuth: true,
  },
  {
    kind: "page",
    id: "home",
    labelKey: "find.pages.home",
    icon: HomeIcon,
    aliases: ["landing", "start"],
    href: "/",
  },
  {
    kind: "page",
    id: "debug",
    labelKey: "find.pages.debugAssistant",
    icon: WrenchIcon,
    aliases: ["troubleshoot", "parser", "upload issue"],
    href: "/debug" as Route,
  },
  // The eight team-stats dimensions. Unscoped they land on the team selector;
  // scoped by a team token they deep-link into that team's tab.
  ...(
    [
      ["overview", "find.pages.teamOverview", ""],
      ["performance", "find.pages.teamPerformance", "/performance"],
      ["heroes", "find.pages.teamHeroes", "/heroes"],
      ["trends", "find.pages.teamTrends", "/trends"],
      ["maps", "find.pages.teamMaps", "/maps"],
      ["swaps", "find.pages.teamSwaps", "/swaps"],
      ["teamfights", "find.pages.teamTeamfights", "/teamfights"],
      ["ultimates", "find.pages.teamUltimates", "/ultimates"],
    ] as const
  ).map(
    ([key, labelKey, path]): NavLeaf => ({
      kind: "page",
      id: `stats-team-${key}`,
      labelKey,
      icon: ChartColumnIcon,
      aliases: [key, "stats", "team"],
      href: "/stats/team",
      requiresAuth: true,
      teamHref: (teamId) => `/stats/team/${teamId}${path}` as Route,
    })
  ),
];

/**
 * Non-navigation commands. Their handlers live in the Find dialog (they need
 * client hooks); the schema only declares identity, matching, and visibility.
 */
export type FindActionDef = {
  kind: "action";
  id:
    | "theme-light"
    | "theme-dark"
    | "theme-system"
    | "share-scrim"
    | "bug-report"
    | "discord"
    | "sign-in"
    | `locale-${string}`;
  labelKey: string;
  icon: LucideIcon;
  aliases?: readonly string[];
  requiresAuth?: boolean;
  requiresUnauth?: boolean;
  /** Only offered when the current pathname matches. */
  pathnamePattern?: RegExp;
  /** Label interpolation values (e.g. locale display name). */
  labelValues?: Record<string, string>;
};

export const FIND_ACTIONS: FindActionDef[] = [
  {
    kind: "action",
    id: "theme-light",
    labelKey: "find.actions.themeLight",
    icon: SunIcon,
    aliases: ["light mode", "appearance"],
  },
  {
    kind: "action",
    id: "theme-dark",
    labelKey: "find.actions.themeDark",
    icon: MoonIcon,
    aliases: ["dark mode", "appearance"],
  },
  {
    kind: "action",
    id: "theme-system",
    labelKey: "find.actions.themeSystem",
    icon: LaptopIcon,
    aliases: ["system theme", "appearance", "auto"],
  },
  {
    kind: "action",
    id: "share-scrim",
    labelKey: "find.actions.shareScrim",
    icon: Share2Icon,
    aliases: ["copy link", "share", "url"],
    pathnamePattern: /\/scrim\//,
  },
  {
    kind: "action",
    id: "bug-report",
    labelKey: "find.actions.bugReport",
    icon: BugIcon,
    aliases: ["issue", "feedback", "problem", "broken"],
  },
  {
    kind: "action",
    id: "discord",
    labelKey: "find.actions.discord",
    icon: MessageCircleIcon,
    aliases: ["community", "server"],
  },
  {
    kind: "action",
    id: "sign-in",
    labelKey: "find.actions.signIn",
    icon: LogInIcon,
    aliases: ["login", "log in", "account"],
    requiresUnauth: true,
  },
];

/** Locale-switch actions are generated from the i18n config at the call site
 * (the config exports display names); this builds the shared shape. */
export function localeAction(code: string, name: string): FindActionDef {
  return {
    kind: "action",
    id: `locale-${code}`,
    labelKey: "find.actions.changeLocale",
    icon: LanguagesIcon,
    aliases: ["language", "locale", name, code],
    labelValues: { locale: name },
  };
}

/** A schema page flattened for Find: resolved href, inherited icon, and the
 * group/section path that disambiguates it in the results list. */
export type FindPage = {
  leaf: NavLeaf;
  href: Route;
  icon: LucideIcon | undefined;
  /** Label keys of ancestors, e.g. the "Stats" group for "Hero Stats". */
  pathLabelKeys: string[];
};

function leafVisible(
  leaf: NavLeaf,
  flags: Partial<FeatureFlags>,
  authed: boolean
): boolean {
  if (leaf.flag && !flags[leaf.flag]) return false;
  if (leaf.requiresAuth && !authed) return false;
  return true;
}

/** Flattens the full schema into Find's searchable page list. */
export function flattenFindPages(
  flags: Partial<FeatureFlags>,
  authed: boolean,
  ctx: FindContext
): FindPage[] {
  const pages: FindPage[] = [];

  function push(leaf: NavLeaf, pathLabelKeys: string[], icon?: LucideIcon) {
    if (!leafVisible(leaf, flags, authed)) return;
    const href = typeof leaf.href === "function" ? leaf.href(ctx) : leaf.href;
    pages.push({ leaf, href, icon: leaf.icon ?? icon, pathLabelKeys });
  }

  for (const section of NAV_SCHEMA) {
    for (const entry of section.entries) {
      if (entry.kind === "group") {
        for (const child of entry.children) {
          push(child, [entry.labelKey], entry.icon);
        }
      } else {
        push(entry, []);
      }
    }
  }
  for (const leaf of FOOTER_SCHEMA) push(leaf, []);
  for (const leaf of FIND_ONLY_PAGES) push(leaf, []);

  return pages;
}
