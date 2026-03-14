import { CtaSection } from "@/components/home/new-landing/cta-section";
import { LogoCloud } from "@/components/home/new-landing/logo-cloud";
import { Testimonial } from "@/components/home/new-landing/testimonial";
import { TrackedLink } from "@/components/home/new-landing/tracked-link";
import { TrackedSection } from "@/components/home/new-landing/tracked-section";
import type { TierData } from "@/components/pricing/pricing-cards";
import { PricingCards } from "@/components/pricing/pricing-cards";
import type { SectionData } from "@/components/pricing/pricing-comparison";
import { PricingComparison } from "@/components/pricing/pricing-comparison";
import { PricingFaq } from "@/components/pricing/pricing-faq";
import { PricingHero } from "@/components/pricing/pricing-hero";
import { PricingStructuredData } from "@/components/pricing/pricing-structured-data";
import { Link } from "@/components/ui/link";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { createCheckout, getCustomerPortalUrl } from "@/lib/stripe";
import { toTitleCase } from "@/lib/utils";
import type { Metadata, Route } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Instrument_Serif } from "next/font/google";
import type { SVGProps } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({
    locale,
    namespace: "pricingPage.metadata",
  });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://parsertime.app/pricing",
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

export default async function PricingPage() {
  const t = await getTranslations("pricingPage");

  const session = await auth();
  const user = await getUser(session?.user?.email);

  const plan = toTitleCase(user?.billingPlan ?? "");
  const isLoggedIn = !!session?.user;

  async function getLink(tier: string) {
    if (session) {
      if (plan === "Free") {
        const checkout = await createCheckout(session, tier);
        return checkout.url as Route;
      }
      return await getCustomerPortalUrl(user!);
    }
    return "/dashboard";
  }

  const tiers: TierData[] = [
    {
      name: t("tiers.free"),
      id: "tier-free",
      href: "/dashboard",
      priceMonthly: t("tiers.freeMonthly"),
      description: t("tiers.freeDescription"),
      mostPopular: false,
      ctaLabel: t("pricing.startFree"),
      highlights: [
        t("features.scrims"),
        t("features.joinTeams"),
        t("features.data"),
        t("features.createTeams.free"),
        t("features.teamMembers.free"),
        t("support.discord"),
      ],
    },
    {
      name: t("tiers.basic"),
      id: "tier-basic",
      href: ((await getLink("Basic")) as Route) ?? "/sign-in",
      priceMonthly: t("tiers.basicMonthly"),
      description: t("tiers.basicDescription"),
      mostPopular: true,
      ctaLabel: t("pricing.upgradeBasic"),
      highlights: [
        t("features.createTeams.basic"),
        t("features.teamMembers.basic"),
        t("mapStatistics.overviewCard"),
        `${t("playerStatistics.last3Months")} – ${t(
          "playerStatistics.last6Months"
        )}`,
        t("support.priority"),
        t("support.devCheck"),
      ],
    },
    {
      name: t("tiers.premium"),
      id: "tier-premium",
      href: ((await getLink("Premium")) as Route) ?? "/sign-in",
      priceMonthly: t("tiers.premiumMonthly"),
      description: t("tiers.premiumDescription"),
      mostPopular: false,
      ctaLabel: t("pricing.upgradePremium"),
      highlights: [
        t("features.createTeams.premium"),
        t("features.teamMembers.premium"),
        t("features.earlyAccess"),
        `${t("playerStatistics.allTime")} & ${t("playerStatistics.custom")}`,
        t("tools.simulator"),
        t("support.custom"),
      ],
    },
  ];

  const sections: SectionData[] = [
    {
      name: t("features.title"),
      features: [
        {
          name: t("features.scrims"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("features.joinTeams"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("features.data"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("features.createTeams.title"),
          tiers: {
            "tier-free": t("features.createTeams.free"),
            "tier-basic": t("features.createTeams.basic"),
            "tier-premium": t("features.createTeams.premium"),
          },
          comingSoon: false,
        },
        {
          name: t("features.teamMembers.title"),
          tiers: {
            "tier-free": t("features.teamMembers.free"),
            "tier-basic": t("features.teamMembers.basic"),
            "tier-premium": t("features.teamMembers.premium"),
          },
          comingSoon: false,
        },
        {
          name: t("features.earlyAccess"),
          tiers: { "tier-premium": true },
          comingSoon: false,
        },
      ],
    },
    {
      name: t("mapStatistics.title"),
      features: [
        {
          name: t("mapStatistics.analytics"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("mapStatistics.killfeeds"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("mapStatistics.customCharts"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("mapStatistics.mapEvents"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("mapStatistics.playerComparison"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("mapStatistics.overviewCard"),
          tiers: { "tier-basic": true, "tier-premium": true },
          comingSoon: false,
        },
        {
          name: t("mapStatistics.customTargets"),
          tiers: { "tier-premium": true },
          comingSoon: true,
        },
      ],
    },
    {
      name: t("playerStatistics.title"),
      features: [
        {
          name: t("playerStatistics.lastWeek"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("playerStatistics.last2Weeks"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("playerStatistics.lastMonth"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("playerStatistics.last3Months"),
          tiers: { "tier-basic": true, "tier-premium": true },
          comingSoon: false,
        },
        {
          name: t("playerStatistics.last6Months"),
          tiers: { "tier-basic": true, "tier-premium": true },
          comingSoon: false,
        },
        {
          name: t("playerStatistics.lastYear"),
          tiers: { "tier-premium": true },
          comingSoon: false,
        },
        {
          name: t("playerStatistics.allTime"),
          tiers: { "tier-premium": true },
          comingSoon: false,
        },
        {
          name: t("playerStatistics.custom"),
          tiers: { "tier-premium": true },
          comingSoon: false,
        },
      ],
    },
    {
      name: t("tools.title"),
      features: [
        {
          name: t("tools.simulator"),
          tiers: { "tier-premium": true },
          comingSoon: false,
        },
      ],
    },
    {
      name: t("support.title"),
      features: [
        {
          name: t("support.discord"),
          tiers: {
            "tier-free": true,
            "tier-basic": true,
            "tier-premium": true,
          },
          comingSoon: false,
        },
        {
          name: t("support.priority"),
          tiers: { "tier-basic": true, "tier-premium": true },
          comingSoon: false,
        },
        {
          name: t("support.devCheck"),
          tiers: { "tier-basic": true, "tier-premium": true },
          comingSoon: false,
        },
        {
          name: t("support.custom"),
          tiers: { "tier-premium": true },
          comingSoon: false,
        },
      ],
    },
  ];

  const faqs = [
    {
      question: t("faq.question1"),
      answer: t("faq.answer1"),
    },
    {
      question: t("faq.question2"),
      answer: t("faq.answer2"),
    },
    {
      question: t("faq.question3"),
      answer: t.rich("faq.answer3", {
        link: (chunks) => (
          <Link
            href="/settings"
            className="text-primary hover:text-primary/80 font-semibold"
            target="_blank"
          >
            {chunks}
          </Link>
        ),
      }),
    },
    {
      question: t("faq.question4"),
      answer: t("faq.answer4"),
    },
    {
      question: t("faq.question5"),
      answer: t.rich("faq.answer5", {
        link: (chunks) => (
          <Link
            href="/contact"
            className="text-primary hover:text-primary/80 font-semibold"
            target="_blank"
          >
            {chunks}
          </Link>
        ),
      }),
    },
    {
      question: t("faq.question6"),
      answer: t("faq.answer6"),
    },
  ];

  // Plain-text FAQs for structured data (no JSX)
  const structuredFaqs = [
    { question: t("faq.question1"), answer: t("faq.answer1") },
    { question: t("faq.question2"), answer: t("faq.answer2") },
    { question: t("faq.question3"), answer: t("faq.answer3Plain") },
    { question: t("faq.question4"), answer: t("faq.answer4") },
    { question: t("faq.question5"), answer: t("faq.answer5Plain") },
    { question: t("faq.question6"), answer: t("faq.answer6") },
  ];

  return (
    <div className={`${instrumentSerif.variable} bg-white dark:bg-black`}>
      <PricingStructuredData faqs={structuredFaqs} />

      <main>
        <TrackedSection name="pricing-hero">
          <PricingHero
            title={t("pricing.header")}
            subtitle={t("pricing.description")}
          />
        </TrackedSection>

        <TrackedSection name="pricing-cards">
          <PricingCards
            tiers={tiers}
            currentPlan={plan}
            isLoggedIn={isLoggedIn}
            translations={{
              currentPlan: t("pricing.currentPlan"),
              month: t("pricing.month"),
              mostPopular: t("pricing.mostPopular"),
            }}
          />
        </TrackedSection>

        <TrackedSection name="pricing-comparison">
          <PricingComparison
            tiers={tiers}
            sections={sections}
            currentPlan={plan}
            isLoggedIn={isLoggedIn}
            comingSoonLabel={t("comingSoon")}
            translations={{
              priceComparison: t("pricing.priceComparison"),
              price: t("pricing.price"),
              month: t("pricing.month"),
              currentPlan: t("pricing.currentPlan"),
              included: t("pricing.included"),
              notIncluded: t("pricing.notIncluded"),
            }}
          />
        </TrackedSection>

        <TrackedSection name="pricing-logos">
          <LogoCloud title={t("logoCloud.title")} />
        </TrackedSection>

        <TrackedSection name="pricing-testimonial">
          <Testimonial
            starRating={t("testimonial.starRating")}
            quote={t("testimonial.quote")}
            author={t("testimonial.author")}
            role={t("testimonial.role")}
          />
        </TrackedSection>

        <TrackedSection name="pricing-faq">
          <PricingFaq
            title={t("faq.title")}
            description={t.rich("faq.description", {
              link: (chunks) => (
                <Link
                  href="/contact"
                  className="text-primary hover:text-primary/80 font-semibold"
                >
                  {chunks}
                </Link>
              ),
            })}
            faqs={faqs}
          />
        </TrackedSection>

        <TrackedSection name="pricing-cta">
          <CtaSection
            subtitle={t("cta.subtitle")}
            title={t("cta.title")}
            description={t("cta.description")}
            getStarted={t("cta.getStarted")}
            learnMore={t("cta.learnMore")}
            isLoggedIn={isLoggedIn}
            learnMoreHref="/about"
          />
        </TrackedSection>
      </main>

      {/* Minimal footer */}
      <footer aria-labelledby="pricing-footer-heading" className="relative">
        <h2 id="pricing-footer-heading" className="sr-only">
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
                  properties={{ platform: item.name, page: "pricing" }}
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
