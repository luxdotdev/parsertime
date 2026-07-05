import {
  BrandThemeHydrator,
  BrandThemeProvider,
} from "@/components/brand-theme-provider";
import { CommandDialogMenu } from "@/components/command-menu";
import { CommandMenuProvider } from "@/components/command-menu-provider";
import { DevTools } from "@/components/devtools";
import {
  FeatureFlagsHydrator,
  FeatureFlagsProvider,
} from "@/components/feature-flags-provider";
import { BetaBanner } from "@/components/home/beta-banner";
import { IntlHydrator, IntlProvider } from "@/components/intl-provider";
import { AppSettingsProvider } from "@/components/settings/app-settings-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { register } from "@/instrumentation";
import { auth } from "@/lib/auth";
import { defaultLocale, type Locale, locales } from "@/i18n/config";
import { DSG_TEAM_ID } from "@/lib/brand-theme";
import { WebVitals } from "@/lib/axiom/client";
import { getAllFlags, toFlagValues } from "@/lib/flags-helpers";
import { QueryProvider } from "@/lib/query";
import { cn } from "@/lib/utils";
import { UsageBeacon } from "@/components/usage/usage-beacon";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FlagValues } from "flags/react";
import type { Metadata } from "next";
import type { AbstractIntlMessages } from "next-intl";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import { SITE_URL } from "@/lib/site";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import enMessages from "../../messages/en.json";
import "./globals.css";

export function generateMetadata(): Metadata {
  // Resolved in the default locale (see getMetadataTranslations) so the route's
  // <head> can be prerendered under Cache Components.
  const t = getMetadataTranslations("metadata");

  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "/",
      type: "website",
      siteName: "Sightline",
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

const switzer = localFont({
  src: [
    {
      path: "../../public/fonts/Switzer-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../public/fonts/Switzer-VariableItalic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-switzer",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

void register();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={cn(
          switzer.variable,
          geistMono.variable,
          "font-sans h-full antialiased"
        )}
      >
        {/* Everything here is request-independent so the ENTIRE provider tree
            prerenders into every route's static shell — pages paint their own
            content instantly instead of waiting behind a root boundary.
            Request-derived values (locale override, flags, session-derived
            bits) stream in as self-contained islands below and hydrate the
            stateful providers after first paint. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={["light", "dark", "disguised"]}
          disableTransitionOnChange
        >
          <NuqsAdapter>
            <QueryProvider>
              <TooltipProvider>
                <IntlProvider
                  // Same shape next-intl consumes at runtime; the JSON import
                  // type is too wide for AbstractIntlMessages (see i18n/request.ts).
                  defaultMessages={
                    enMessages as unknown as AbstractIntlMessages
                  }
                >
                  <CommandMenuProvider>
                    <AppSettingsProvider>
                      <BrandThemeProvider>
                        <FeatureFlagsProvider>
                          <BetaBanner />
                          {children}
                          <Suspense fallback={null}>
                            <LocaleIsland />
                          </Suspense>
                          <Suspense fallback={null}>
                            <FlagsIsland />
                          </Suspense>
                          <Suspense fallback={null}>
                            <SessionIsland />
                          </Suspense>
                        </FeatureFlagsProvider>
                      </BrandThemeProvider>
                    </AppSettingsProvider>
                  </CommandMenuProvider>
                </IntlProvider>
              </TooltipProvider>
              <Toaster />
              <SpeedInsights />
              <Analytics />
              <Suspense fallback={null}>
                <UsageBeacon />
              </Suspense>
              <DevTools />
              <WebVitals />
            </QueryProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}

/**
 * Streams the cookie-selected locale into the static intl provider. Reads the
 * cookie directly (not `getLocale`) to guarantee this island is request-time.
 * Default-locale users get no override — and no message payload — at all.
 */
async function LocaleIsland() {
  const cookieLocale = (await cookies()).get("LOCALE")?.value;
  const locale: Locale = locales.some((l) => l.code === cookieLocale)
    ? (cookieLocale as Locale)
    : defaultLocale;
  if (locale === defaultLocale) return null;

  const messages = (
    (await import(`../../messages/${locale}.json`)) as {
      default: AbstractIntlMessages;
    }
  ).default;

  return <IntlHydrator locale={locale} messages={messages} />;
}

/**
 * Streams real flag values (decoded from the proxy's precomputed code) into
 * the static flags provider, plus the Flags Explorer values script.
 */
async function FlagsIsland() {
  const flags = await getAllFlags();

  return (
    <>
      <FeatureFlagsHydrator flags={flags} />
      <FlagValues values={toFlagValues(flags)} />
    </>
  );
}

/**
 * Streams the session-derived extras: the command-menu dialog (its `user`
 * prop only feeds the lazily-opened bug-report form) and the DSG brand-theme
 * unlock. Nothing visible blocks on these.
 */
async function SessionIsland() {
  const session = await auth();
  const [user, isDsgMember] = session
    ? await Promise.all([
        AppRuntime.runPromise(
          UserService.pipe(
            Effect.flatMap((svc) => svc.getUser(session.user.email))
          )
        ),
        AppRuntime.runPromise(
          UserService.pipe(
            Effect.flatMap((svc) =>
              svc.isMemberOfTeam(session.user.email, DSG_TEAM_ID)
            )
          )
        ),
      ])
    : [null, false];

  return (
    <>
      <BrandThemeHydrator canUseDisguised={isDsgMember} />
      <CommandDialogMenu user={user} />
    </>
  );
}
