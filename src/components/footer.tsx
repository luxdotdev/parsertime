import { Link } from "@/components/ui/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorkshopCodePill } from "@/components/workshop-code-pill";
import {
  aiChat,
  dataLabeling,
  positionalData,
  scoutingTool,
} from "@/lib/flags";
import prisma from "@/lib/prisma";
import { get } from "@vercel/edge-config";
import type { Route } from "next";
import { getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";
import Image from "next/image";

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
    { labelKey: "comparePlayers", href: "/stats/compare" },
  ],
};

const TEAMS_LINKS: FooterColumn = {
  titleKey: "teamsTitle",
  links: [
    { labelKey: "yourTeams", href: "/team" },
    { labelKey: "teamStats", href: "/stats/team" },
    { labelKey: "joinTeam", href: "/team/join" },
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

function FooterColumn({
  column,
  t,
}: {
  column: FooterColumn;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-foreground text-sm font-bold tracking-wider uppercase">
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

export async function Footer() {
  const t = await getTranslations("footer");

  const [
    version,
    changelog,
    scoutingEnabled,
    aiChatEnabled,
    dataToolsEnabled,
    positionalDataEnabled,
    healthStatus,
  ] = await Promise.all([
    get<string>("version"),
    get<Route>("changelog"),
    scoutingTool(),
    aiChat(),
    dataLabeling(),
    positionalData(),
    unstable_cache(
      async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return "healthy" as const;
        } catch {
          return "degraded" as const;
        }
      },
      ["health-check"],
      { revalidate: 60 }
    )(),
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
  ];

  return (
    <footer className="bg-background border-t py-12 print:hidden">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-12 xl:grid-cols-[280px_1fr]">
          <div className="flex flex-col items-start gap-6">
            <Link
              href="/"
              aria-label="Home"
              className="flex items-center gap-2"
            >
              <Image
                src="/parsertime.png"
                alt="Parsertime"
                width={50}
                height={50}
                className="h-8 w-auto dark:invert"
              />
              <span className="text-lg font-semibold tracking-tight">
                Parsertime
              </span>
            </Link>

            {version && (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
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
                <span>&bull;</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${healthStatus === "healthy"
                      ? "bg-green-500"
                      : healthStatus === "degraded"
                        ? "bg-yellow-500"
                        : "bg-muted-foreground"
                      }`}
                  />
                  {healthStatus === "healthy"
                    ? t("healthOk")
                    : healthStatus === "degraded"
                      ? t("healthDegraded")
                      : t("healthUnknown")}
                </span>
              </div>
            )}

            <WorkshopCodePill
              code={positionalDataEnabled ? "Z0ASA" : "DKEEH"}
            />

            <p className="text-muted-foreground text-sm">
              &copy; 2024&ndash;{new Date().getFullYear()} lux.dev
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
