import { AboutHero } from "@/components/about/about-hero";
import { AboutStory } from "@/components/about/about-story";
import { AboutTimeline } from "@/components/about/about-timeline";
import { AboutValues } from "@/components/about/about-values";
import { FounderSpotlight } from "@/components/about/founder-spotlight";
import { OpenSourceBanner } from "@/components/about/open-source-banner";
import { CtaSection } from "@/components/home/new-landing/cta-section";
import { StatsCounter } from "@/components/home/new-landing/stats-counter";
import { TrackedLink } from "@/components/home/new-landing/tracked-link";
import { TrackedSection } from "@/components/home/new-landing/tracked-section";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Metadata, Route } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { OrganizationJsonLd, ProfilePageJsonLd } from "next-seo";
import { unstable_cache } from "next/cache";
import { Instrument_Serif } from "next/font/google";
import type { SVGProps } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "aboutPage.metadata" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://parsertime.app/about",
      type: "website",
      siteName: "Parsertime",
    },
  };
}

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-instrument-serif",
});

const getAboutPageStats = unstable_cache(
  async () => {
    const results = await Promise.allSettled([
      prisma.playerStat.count(),
      prisma.calculatedStat.count(),
      prisma.kill.count(),
      prisma.map.count(),
    ]);

    const [playerStatCount, calculatedStatCount, killCount, mapCount] =
      results.map((r) => (r.status === "fulfilled" ? r.value : 0));

    return {
      statsCount: Math.max(playerStatCount + calculatedStatCount, 800_000),
      killCount: Math.max(killCount, 450_000),
      mapCount: Math.max(mapCount, 6_000),
    };
  },
  ["about-page-stats"],
  { revalidate: 3600 }
);

function roundCount(count: number): { value: number; suffix: string } {
  if (count >= 100_000) {
    const rounded = Math.floor(count / 10_000) * 10_000;
    return { value: rounded, suffix: "+" };
  }
  if (count >= 10_000) {
    const rounded = Math.floor(count / 5_000) * 5_000;
    return { value: rounded, suffix: "+" };
  }
  if (count >= 1_000) {
    const rounded = Math.floor(count / 500) * 500;
    return { value: rounded, suffix: "+" };
  }
  return { value: count, suffix: "+" };
}

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

export default async function AboutPage() {
  const [{ statsCount, killCount, mapCount }, t, session] = await Promise.all([
    getAboutPageStats(),
    getTranslations("aboutPage"),
    auth(),
  ]);

  const isLoggedIn = !!session?.user;

  const statsData = [
    {
      id: "stats",
      name: t("stats.statsTracked"),
      ...roundCount(statsCount),
    },
    {
      id: "kills",
      name: t("stats.killsTracked"),
      ...roundCount(killCount),
    },
    {
      id: "maps",
      name: t("stats.mapsUploaded"),
      ...roundCount(mapCount),
    },
    {
      id: "uptime",
      name: t("stats.uptime"),
      value: 99.99,
      suffix: "99.99%",
    },
  ];

  const values = [
    {
      name: t("values.convenience.name"),
      description: t("values.convenience.description"),
      icon: "PresentationChartLineIcon",
    },
    {
      name: t("values.accessibility.name"),
      description: t("values.accessibility.description"),
      icon: "HandRaisedIcon",
    },
    {
      name: t("values.community.name"),
      description: t("values.community.description"),
      icon: "UserGroupIcon",
    },
    {
      name: t("values.openSource.name"),
      description: t("values.openSource.description"),
      icon: "AcademicCapIcon",
    },
    {
      name: t("values.improvement.name"),
      description: t("values.improvement.description"),
      icon: "RocketLaunchIcon",
    },
    {
      name: t("values.reliable.name"),
      description: t("values.reliable.description"),
      icon: "ServerStackIcon",
    },
  ];

  const milestones = [
    {
      date: t("timeline.milestone1.date"),
      title: t("timeline.milestone1.title"),
      description: t("timeline.milestone1.description"),
    },
    {
      date: t("timeline.milestone2.date"),
      title: t("timeline.milestone2.title"),
      description: t("timeline.milestone2.description"),
    },
    {
      date: t("timeline.milestone3.date"),
      title: t("timeline.milestone3.title"),
      description: t("timeline.milestone3.description"),
    },
    {
      date: t("timeline.milestone4.date"),
      title: t("timeline.milestone4.title"),
      description: t("timeline.milestone4.description"),
    },
    {
      date: t("timeline.milestone5.date"),
      title: t("timeline.milestone5.title"),
      description: t("timeline.milestone5.description"),
    },
  ];

  const founderSocialLinks = [
    { name: "GitHub", href: "https://github.com/lucasdoell" },
    { name: "X", href: "https://twitter.com/lucasdoell" },
    { name: "Bluesky", href: "https://bsky.app/profile/lucasdoell.dev" },
  ];

  return (
    <div className={`${instrumentSerif.variable} bg-white dark:bg-black`}>
      <OrganizationJsonLd
        name="lux.dev"
        url="https://lux.dev"
        logo="https://parsertime.app/parsertime.png"
        sameAs={[
          "https://twitter.com/luxdotdev",
          "https://bsky.app/profile/lux.dev",
          "https://github.com/luxdotdev",
        ]}
      />
      <ProfilePageJsonLd
        mainEntity={
          {
            "@type": "Person",
            name: "Lucas Doell",
            url: "https://github.com/lucasdoell",
            jobTitle: "Founder & Engineer",
            worksFor: {
              "@type": "Organization",
              name: "lux.dev",
              url: "https://lux.dev",
            },
            sameAs: [
              "https://github.com/lucasdoell",
              "https://twitter.com/lucasdoell",
              "https://bsky.app/profile/lucasdoell.dev",
            ],
            // next-seo's Person type omits jobTitle despite it being a valid Schema.org property
          } as Parameters<typeof ProfilePageJsonLd>[0]["mainEntity"]
        }
      />
      <main>
        <TrackedSection name="about-hero">
          <AboutHero title={t("hero.title")} subtitle={t("hero.subtitle")} />
        </TrackedSection>

        <TrackedSection name="about-story">
          <AboutStory
            title={t("story.title")}
            paragraphs={[
              t("story.paragraph1"),
              t("story.paragraph2"),
              t("story.paragraph3"),
            ]}
          />
        </TrackedSection>

        <TrackedSection name="about-timeline">
          <AboutTimeline title={t("timeline.title")} milestones={milestones} />
        </TrackedSection>

        <TrackedSection name="about-stats">
          <StatsCounter
            subtitle={t("stats.subtitle")}
            title={t("stats.title")}
            description={t("stats.description")}
            stats={statsData}
            showChart={false}
          />
        </TrackedSection>

        <TrackedSection name="about-values">
          <AboutValues
            title={t("values.title")}
            subtitle={t("values.subtitle")}
            values={values}
          />
        </TrackedSection>

        <TrackedSection name="about-founder">
          <FounderSpotlight
            label={t("founder.label")}
            name={t("founder.name")}
            role={t("founder.role")}
            bio={t("founder.bio")}
            imageSrc="/marketing/lucas.jpg"
            socialLinks={founderSocialLinks}
          />
        </TrackedSection>

        <TrackedSection name="about-oss">
          <OpenSourceBanner
            title={t("openSource.title")}
            description={t("openSource.description")}
            linkText={t("openSource.linkText")}
            href="https://github.com/luxdotdev/parsertime"
          />
        </TrackedSection>

        <TrackedSection name="about-cta">
          <CtaSection
            subtitle={t("cta.subtitle")}
            title={t("cta.title")}
            description={t("cta.description")}
            getStarted={t("cta.getStarted")}
            learnMore={t("cta.learnMore")}
            isLoggedIn={isLoggedIn}
            learnMoreHref="/pricing"
          />
        </TrackedSection>
      </main>

      {/* Minimal footer */}
      <footer aria-labelledby="about-footer-heading" className="relative">
        <h2 id="about-footer-heading" className="sr-only">
          {t("footer.screenReader")}
        </h2>
        <div className="mx-auto max-w-7xl px-6 pt-4 pb-8 lg:px-8">
          <div className="border-t border-gray-900/10 pt-8 md:flex md:items-center md:justify-between dark:border-white/10">
            <div className="flex space-x-6 md:order-2">
              {footerNavigation.social.map((item) => (
                <TrackedLink
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  event="social-click"
                  properties={{ platform: item.name, page: "about" }}
                  className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </TrackedLink>
              ))}
            </div>
            <p className="mt-8 text-xs leading-5 text-gray-400 md:order-1 md:mt-0">
              &copy; 2024&ndash;{new Date().getFullYear()}{" "}
              {t("footer.copyright")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
