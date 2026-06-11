import {
  getLandingPageStats,
  roundCount,
} from "@/components/home/landing-stats";
import { StructuredData } from "@/components/home/new-landing/structured-data";
import { TrackedLink } from "@/components/home/new-landing/tracked-link";
import { TrackedSection } from "@/components/home/new-landing/tracked-section";
import { auth } from "@/lib/auth";
import { get } from "@vercel/edge-config";
import type { Route } from "next";
import { getTranslations } from "next-intl/server";
import type { SVGProps } from "react";
import { CtaSection } from "./cta-section";
import { DataPipeline } from "./data-pipeline";
import { Features } from "./features";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { LogoCloud } from "./logo-cloud";
import { PositionalShowcase } from "./positional-showcase";
import { Spotlight } from "./spotlight";
import { Testimonial } from "./testimonial";

type IconProps = Omit<SVGProps<SVGSVGElement>, "fill" | "viewbox">;

type FooterNavigation = {
  social: {
    name: string;
    href: Route;
    icon: (props: IconProps) => React.ReactNode;
  }[];
};

const footerNavigation: FooterNavigation = {
  social: [
    {
      name: "X",
      href: "https://twitter.com/luxdotdev",
      icon: (props: IconProps) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
        </svg>
      ),
    },
    {
      name: "Bluesky",
      href: "https://bsky.app/profile/lux.dev",
      icon: (props: IconProps) => (
        <svg fill="currentColor" viewBox="-50 -50 430 390" {...props}>
          <path d="M180 141.964C163.699 110.262 119.308 51.1817 78.0347 22.044C38.4971 -5.86834 23.414 -1.03207 13.526 3.43594C2.08093 8.60755 0 26.1785 0 36.5164C0 46.8542 5.66748 121.272 9.36416 133.694C21.5786 174.738 65.0603 188.607 105.104 184.156C107.151 183.852 109.227 183.572 111.329 183.312C109.267 183.642 107.19 183.924 105.104 184.156C46.4204 192.847 -5.69621 214.233 62.6582 290.33C137.848 368.18 165.705 273.637 180 225.702C194.295 273.637 210.76 364.771 295.995 290.33C360 225.702 313.58 192.85 254.896 184.158C252.81 183.926 250.733 183.645 248.671 183.315C250.773 183.574 252.849 183.855 254.896 184.158C294.94 188.61 338.421 174.74 350.636 133.697C354.333 121.275 360 46.8568 360 36.519C360 26.1811 357.919 8.61012 346.474 3.43851C336.586 -1.02949 321.503 -5.86576 281.965 22.0466C240.692 51.1843 196.301 110.262 180 141.964Z" />
        </svg>
      ),
    },
    {
      name: "GitHub",
      href: "https://github.com/lucasdoell",
      icon: (props: IconProps) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ],
};

export async function V3LandingPage() {
  const [
    { statsCount, killCount, mapCount, teamCount },
    latestUpdates,
    t,
    session,
  ] = await Promise.all([
    getLandingPageStats(),
    get<{ title: string; url: Route }>("latestUpdates"),
    getTranslations("landingPage"),
    auth(),
  ]);

  const isLoggedIn = !!session?.user;
  const hasLatestUpdates =
    typeof latestUpdates?.title === "string" &&
    latestUpdates.title.trim().length > 0 &&
    typeof latestUpdates?.url === "string" &&
    latestUpdates.url.trim().length > 0;

  const statsData = [
    {
      id: "stats",
      name: t("stats.statsTracked"),
      ...roundCount(statsCount),
    },
    {
      id: "kills",
      name: t("stats.kills"),
      ...roundCount(killCount),
    },
    {
      id: "maps",
      name: t("stats.maps"),
      ...roundCount(mapCount),
    },
    {
      id: "uptime",
      name: t("stats.uptime"),
      value: 99.99,
      suffix: "99.99%",
    },
  ];

  return (
    <div className="bg-background text-foreground">
      <StructuredData teamCount={teamCount} />
      <a
        href="#main-content"
        className="focus-visible:bg-background focus-visible:text-foreground sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:shadow-lg"
      >
        Skip to content
      </a>
      <main id="main-content">
        <TrackedSection name="hero">
          <Hero
            eyebrow={t("hero.eyebrow")}
            title={t("hero.title")}
            description={t("hero.description")}
            getStarted={t("hero.getStarted")}
            liveDemo={t("hero.liveDemo")}
            trustedBy={t("hero.trustedBy", { count: teamCount })}
            liveData={t("hero.liveData")}
            latestUpdatesLabel={t("hero.latestUpdates")}
            latestUpdatesTitle={
              hasLatestUpdates ? latestUpdates.title : undefined
            }
            latestUpdatesUrl={hasLatestUpdates ? latestUpdates.url : undefined}
            stats={statsData}
            isLoggedIn={isLoggedIn}
          />
        </TrackedSection>

        <TrackedSection name="logo-cloud">
          <LogoCloud title={t("logoCloud.title")} />
        </TrackedSection>

        <TrackedSection name="positional-showcase">
          <PositionalShowcase
            badge={t("positional.badge")}
            title={t("positional.title")}
            description={t("positional.description")}
            subFeatures={[
              {
                name: t("positional.replayName"),
                description: t("positional.replayDescription"),
              },
              {
                name: t("positional.heatmapsName"),
                description: t("positional.heatmapsDescription"),
              },
              {
                name: t("positional.averagesName"),
                description: t("positional.averagesDescription"),
              },
            ]}
          />
        </TrackedSection>

        <TrackedSection name="features">
          <Features
            subtitle={t("feature1.subtitle")}
            title={t("feature1.title")}
            description={t("feature1.description")}
            bentoHeadings={{
              dataDecisions: t("featureBento.dataDecisions"),
              everyMetric: t("featureBento.everyMetric"),
              noSpreadsheets: t("featureBento.noSpreadsheets"),
              spotChanges: t("featureBento.spotChanges"),
              yourData: t("featureBento.yourData"),
            }}
            features={{
              builtByCoaches: {
                name: t("primaryFeatures.builtByCoaches.name"),
                description: t("primaryFeatures.builtByCoaches.description"),
              },
              shareWithTeam: {
                name: t("primaryFeatures.shareWithTeam.name"),
                description: t("primaryFeatures.shareWithTeam.description"),
              },
              dataCharts: {
                name: t("secondaryFeatures.dataCharts.name"),
                description: t("secondaryFeatures.dataCharts.description"),
              },
              filterStats: {
                name: t("secondaryFeatures.filterStats.name"),
                description: t("secondaryFeatures.filterStats.description"),
              },
              advancedSecurity: {
                name: t("secondaryFeatures.advancedSecurity.name"),
                description: t(
                  "secondaryFeatures.advancedSecurity.description"
                ),
              },
              fullyCustomizable: {
                name: t("secondaryFeatures.fullyCustomizable.name"),
                description: t(
                  "secondaryFeatures.fullyCustomizable.description"
                ),
              },
            }}
          />
        </TrackedSection>

        <TrackedSection name="data-pipeline">
          <DataPipeline
            eyebrow={t("pipeline.eyebrow")}
            title={t("pipeline.title")}
            description={t("pipeline.description")}
            sourcesLabel={t("pipeline.sourcesLabel")}
            processingLabel={t("pipeline.processingLabel")}
            outputsLabel={t("pipeline.outputsLabel")}
            outputs={{
              dashboards: t("pipeline.outputDashboards"),
              ratings: t("pipeline.outputRatings"),
              replays: t("pipeline.outputReplays"),
              trends: t("pipeline.outputTrends"),
            }}
          />
        </TrackedSection>

        <TrackedSection name="how-it-works">
          <HowItWorks
            title={`${t("howItWorks.title")} ${t("howItWorks.titleAccent")}`}
            steps={[
              {
                id: 1,
                title: t("howItWorks.step1Title"),
                description: t("howItWorks.step1Description"),
                imageSrcDark: "/dashboard.png",
                imageSrcLight: "/dashboard-light.png",
                imageAlt: "Create a team",
              },
              {
                id: 2,
                title: t("howItWorks.step2Title"),
                description: t("howItWorks.step2Description"),
                imageSrcDark: "/create-scrim.png",
                imageSrcLight: "/create-scrim-light.png",
                imageAlt: "Upload scrims",
              },
              {
                id: 3,
                title: t("howItWorks.step3Title"),
                description: t("howItWorks.step3Description"),
                imageSrcDark: "/player-page.png",
                imageSrcLight: "/player-page-light.png",
                imageAlt: "See instant results",
              },
            ]}
          />
        </TrackedSection>

        <TrackedSection name="csr-spotlight">
          <Spotlight
            subtitle={t("csrSpotlight.subtitle")}
            title={t("csrSpotlight.title")}
            description={t("csrSpotlight.description")}
            highlights={[
              {
                label: t("csrSpotlight.highlight1Label"),
                description: t("csrSpotlight.highlight1Description"),
              },
              {
                label: t("csrSpotlight.highlight2Label"),
                description: t("csrSpotlight.highlight2Description"),
              },
              {
                label: t("csrSpotlight.highlight3Label"),
                description: t("csrSpotlight.highlight3Description"),
              },
            ]}
            imageSrcDark="/hero-sr.png"
            imageSrcLight="/hero-sr-light.png"
            imageAlt="Custom Hero Skill Rating screenshot"
            imagePosition="right"
          />
        </TrackedSection>

        <TrackedSection name="team-spotlight">
          <Spotlight
            subtitle={t("teamStatsSpotlight.subtitle")}
            title={t("teamStatsSpotlight.title")}
            description={t("teamStatsSpotlight.description")}
            highlights={[
              {
                label: t("teamStatsSpotlight.highlight1Label"),
                description: t("teamStatsSpotlight.highlight1Description"),
              },
              {
                label: t("teamStatsSpotlight.highlight2Label"),
                description: t("teamStatsSpotlight.highlight2Description"),
              },
              {
                label: t("teamStatsSpotlight.highlight3Label"),
                description: t("teamStatsSpotlight.highlight3Description"),
              },
            ]}
            imageSrcDark="/team-swaps.png"
            imageSrcLight="/team-swaps-light.png"
            imageAlt="Team Analytics Dashboard screenshot"
            imagePosition="left"
          />
        </TrackedSection>

        <TrackedSection name="testimonial">
          <Testimonial
            starRating={t("testimonial.starRating")}
            quote={t("testimonial.quote")}
            author={t("testimonial.author")}
            role={t("testimonial.role")}
          />
        </TrackedSection>

        <TrackedSection name="cta">
          <CtaSection
            subtitle={t("cta.subtitle")}
            title={t("cta.title")}
            description={t("cta.description")}
            getStarted={t("cta.getStarted")}
            learnMore={t("cta.learnMore")}
            isLoggedIn={isLoggedIn}
          />
        </TrackedSection>
      </main>

      <footer aria-labelledby="footer-heading" className="relative">
        <h2 id="footer-heading" className="sr-only">
          {t("footer.screenReader")}
        </h2>
        <div className="mx-auto max-w-7xl px-6 pt-4 pb-8 lg:px-8">
          <div className="border-border border-t pt-8 md:flex md:items-center md:justify-between">
            <div className="flex space-x-6 md:order-2">
              {footerNavigation.social.map((item) => (
                <TrackedLink
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  event="social-click"
                  properties={{ platform: item.name }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </TrackedLink>
              ))}
            </div>
            <p className="text-muted-foreground mt-8 text-xs leading-5 md:order-1 md:mt-0">
              &copy; 2024&ndash;{new Date().getFullYear()}{" "}
              {t("footer.copyright")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
