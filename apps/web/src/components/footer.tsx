import { HealthStatus } from "@/components/health-status";
import { Link } from "@/components/ui/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorkshopCodePill } from "@/components/workshop-code-pill";
import {
  aiChat,
  coachingCanvas,
  dataLabeling,
  scoutingTool,
  tournament,
} from "@/lib/flags";
import { get } from "@vercel/edge-config";
import type { Route } from "next";
import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Suspense } from "react";

type FooterLink = {
  labelKey: string;
  href: string;
  external?: boolean;
};

type FooterColumn = {
  titleKey: string;
  links: FooterLink[];
};

const PRODUCT_LINKS: FooterColumn = {
  titleKey: "productTitle",
  links: [
    { labelKey: "dashboard", href: "/dashboard" },
    { labelKey: "settings", href: "/settings" },
    { labelKey: "leaderboard", href: "/leaderboard" },
  ],
};

const STATS_LINKS: FooterColumn = {
  titleKey: "statsTitle",
  links: [
    { labelKey: "playerStats", href: "/stats" },
    { labelKey: "heroStats", href: "/stats/hero" },
    { labelKey: "mapStats", href: "/stats/map" },
    { labelKey: "comparePlayers", href: "/stats/compare" },
  ],
};

const TEAMS_LINKS: FooterColumn = {
  titleKey: "teamsTitle",
  links: [
    { labelKey: "yourTeams", href: "/team" },
    { labelKey: "matchmaker", href: "/matchmaker" },
    { labelKey: "availability", href: "/team" },
  ],
};

const SUPPORT_LINKS: FooterColumn = {
  titleKey: "supportTitle",
  links: [
    { labelKey: "contact", href: "/contact" },
    {
      labelKey: "docs",
      href: "https://parserti.me/docs",
      external: true,
    },
    {
      labelKey: "feedback",
      href: "https://parserti.me/feedback",
      external: true,
    },
    {
      labelKey: "schema",
      href: "https://parserti.me/schema",
      external: true,
    },

    { labelKey: "termsOfService", href: "/terms-of-service" },
    { labelKey: "privacyPolicy", href: "/privacy" },
  ],
};

const COMPANY_LINKS: FooterColumn = {
  titleKey: "companyTitle",
  links: [
    { labelKey: "luxdev", href: "https://lux.dev", external: true },
    {
      labelKey: "github",
      href: "https://parserti.me/github",
      external: true,
    },
    {
      labelKey: "discord",
      href: "https://parserti.me/discord",
      external: true,
    },
    {
      labelKey: "twitter",
      href: "https://twitter.com/luxdotdev",
      external: true,
    },
    {
      labelKey: "bluesky",
      href: "https://bsky.app/profile/lux.dev",
      external: true,
    },
  ],
};

const SCOUTING_LINKS: FooterColumn = {
  titleKey: "scoutingTitle",
  links: [
    { labelKey: "scoutTeam", href: "/scouting" },
    { labelKey: "scoutPlayer", href: "/scouting/player" },
  ],
};

const ANALYST_LINKS: FooterColumn = {
  titleKey: "analystTitle",
  links: [
    { labelKey: "newChat", href: "/chat" },
    { labelKey: "reports", href: "/reports" },
  ],
};

const DATA_TOOLS_LINKS: FooterColumn = {
  titleKey: "dataToolsTitle",
  links: [
    { labelKey: "dataLabeling", href: "/data-labeling" },
    { labelKey: "mapCalibration", href: "/map-calibration" },
  ],
};

const COACHING_LINKS: FooterColumn = {
  titleKey: "coachingTitle",
  links: [{ labelKey: "coachingCanvas", href: "/coaching/canvas" }],
};

const TOURNAMENT_LINKS: FooterColumn = {
  titleKey: "tournamentsTitle",
  links: [
    { labelKey: "viewTournaments", href: "/tournaments" },
    { labelKey: "createTournament", href: "/tournaments/create" },
  ],
};

function FooterColumn({
  column,
  t,
}: {
  column: FooterColumn;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-foreground/80 font-mono text-xs font-medium tracking-[0.06em] uppercase">
        {t(column.titleKey)}
      </p>
      <ul className="space-y-3 text-sm">
        {column.links.map((link) => (
          <li key={link.labelKey}>
            <Link
              href={link.href as Route}
              {...(link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The footer reads the locale cookie (getTranslations) and the current year,
// both request-time. Wrapping its own content in Suspense lets it sit in any
// route's static shell without blocking the prerender — it streams itself in.
export function Footer() {
  return (
    <Suspense fallback={null}>
      <FooterContent />
    </Suspense>
  );
}

// The copyright year is non-deterministic (`new Date()`), which can't be
// prerendered directly. Computing it inside `use cache` lets it run once and be
// cached, so the footer stays part of the static shell on prerendered routes.
// oxlint-disable-next-line typescript/require-await -- `use cache` requires an async function even though the body has no await.
async function getCopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

async function FooterContent() {
  const t = await getTranslations("footer");
  const copyrightYear = await getCopyrightYear();

  const [
    version,
    changelog,
    scoutingEnabled,
    aiChatEnabled,
    dataToolsEnabled,
    coachingCanvasEnabled,
    tournamentEnabled,
  ] = await Promise.all([
    get<string>("version"),
    get<Route>("changelog"),
    scoutingTool(),
    aiChat(),
    dataLabeling(),
    coachingCanvas(),
    tournament(),
  ]);

  const columns: FooterColumn[] = [
    PRODUCT_LINKS,
    STATS_LINKS,
    TEAMS_LINKS,
    SUPPORT_LINKS,
    COMPANY_LINKS,
    ...(scoutingEnabled ? [SCOUTING_LINKS] : []),
    ...(aiChatEnabled ? [ANALYST_LINKS] : []),
    ...(dataToolsEnabled ? [DATA_TOOLS_LINKS] : []),
    ...(coachingCanvasEnabled ? [COACHING_LINKS] : []),
    ...(tournamentEnabled ? [TOURNAMENT_LINKS] : []),
  ];

  return (
    <footer className="bg-background border-border/60 border-t py-12 print:hidden">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-12 xl:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-start gap-6">
            <Link
              href="/"
              aria-label="Home"
              className="group flex items-center gap-2"
            >
              <Image
                src="/parsertime.png"
                alt=""
                width={50}
                height={50}
                className="h-7 w-auto dark:invert"
              />
              <span className="text-foreground text-base font-semibold tracking-tight">
                Parsertime
              </span>
            </Link>

            {version && (
              <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={changelog ?? "https://lux.dev/blog"}
                      target="_blank"
                      className="hover:text-foreground transition-colors"
                    >
                      {version}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>{t("changelog")}</TooltipContent>
                </Tooltip>
                <span aria-hidden="true">&bull;</span>
                <HealthStatus />
              </div>
            )}

            <WorkshopCodePill code="Z0ASA" />

            <p className="text-muted-foreground font-mono text-xs">
              &copy; 2024&ndash;{copyrightYear} lux.dev
            </p>
          </div>

          <nav
            aria-label={t("navAriaLabel")}
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5"
          >
            {columns.map((col) => (
              <FooterColumn key={col.titleKey} column={col} t={t} />
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
