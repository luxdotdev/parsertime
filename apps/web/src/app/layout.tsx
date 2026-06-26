import { BrandThemeProvider } from "@/components/brand-theme-provider";
import { CommandDialogMenu } from "@/components/command-menu";
import { CommandMenuProvider } from "@/components/command-menu-provider";
import { DevTools } from "@/components/devtools";
import { FeatureFlagsProvider } from "@/components/feature-flags-provider";
import { BetaBanner } from "@/components/home/beta-banner";
import { AppSettingsProvider } from "@/components/settings/app-settings-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import { register } from "@/instrumentation";
import { auth } from "@/lib/auth";
import { defaultLocale } from "@/i18n/config";
import { DSG_TEAM_ID } from "@/lib/brand-theme";
import { WebVitals } from "@/lib/axiom/client";
import { resolveAllFlags, toFlagValues } from "@/lib/flags-helpers";
import { QueryProvider } from "@/lib/query";
import { cn } from "@/lib/utils";
import { UsageBeacon } from "@/components/usage/usage-beacon";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FlagValues } from "flags/react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { Suspense, type ReactNode } from "react";
import { getLocale, getMessages } from "next-intl/server";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

export function generateMetadata(): Metadata {
  // Resolved in the default locale (see getMetadataTranslations) so the route's
  // <head> can be prerendered under Cache Components.
  const t = getMetadataTranslations("metadata");

  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL("https://parsertime.app"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/opengraph-image.png`,
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
        {/* The provider tree depends on request-time data (locale, auth,
            feature flags), so it streams under Suspense while the document
            shell prerenders. See migrating-to-cache-components. */}
        <Suspense fallback={null}>
          <RootProviders>{children}</RootProviders>
        </Suspense>
      </body>
    </html>
  );
}

async function RootProviders({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await auth();
  let user = null;

  if (session) {
    user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
  }

  let isDsgMember = false;

  if (session) {
    isDsgMember = await AppRuntime.runPromise(
      UserService.pipe(
        Effect.flatMap((svc) =>
          svc.isMemberOfTeam(session.user.email, DSG_TEAM_ID)
        )
      )
    );
  }

  const flags = await resolveAllFlags();

  return (
    <NuqsAdapter>
      <QueryProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme={isDsgMember ? "disguised" : "system"}
          enableSystem
          themes={["light", "dark", "disguised"]}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <CommandMenuProvider>
                <AppSettingsProvider>
                  <BrandThemeProvider canUseDisguised={isDsgMember}>
                    <FeatureFlagsProvider flags={flags}>
                      <FlagValues values={toFlagValues(flags)} />
                      <BetaBanner />
                      {children}
                      <CommandDialogMenu user={user} />
                    </FeatureFlagsProvider>
                  </BrandThemeProvider>
                </AppSettingsProvider>
              </CommandMenuProvider>
            </NextIntlClientProvider>
          </TooltipProvider>
          <Toaster />
          <SpeedInsights />
          <Analytics />
          <Suspense fallback={null}>
            <UsageBeacon />
          </Suspense>
          <DevTools />
          <WebVitals />
        </ThemeProvider>
      </QueryProvider>
    </NuqsAdapter>
  );
}
