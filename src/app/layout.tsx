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
import { WebVitals } from "@/lib/axiom/client";
import { resolveAllFlags, toFlagValues } from "@/lib/flags-helpers";
import { QueryProvider } from "@/lib/query";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FlagValues } from "flags/react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "metadata" });

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
      locale,
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

register();

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await auth();
  let user = null;

  if (session) {
    user = await AppRuntime.runPromise(
      UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
    );
  }

  const flags = await resolveAllFlags();

  return (
    <html lang={locale} className="h-full" suppressHydrationWarning>
      <body
        className={cn(
          switzer.variable,
          geistMono.variable,
          "font-sans h-full antialiased"
        )}
      >
        <NuqsAdapter>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TooltipProvider>
                <NextIntlClientProvider messages={messages}>
                  <CommandMenuProvider>
                    <AppSettingsProvider>
                      <FeatureFlagsProvider flags={flags}>
                        <FlagValues values={toFlagValues(flags)} />
                        <BetaBanner />
                        {children}
                        <CommandDialogMenu user={user} />
                      </FeatureFlagsProvider>
                    </AppSettingsProvider>
                  </CommandMenuProvider>
                </NextIntlClientProvider>
              </TooltipProvider>
              <Toaster />
              <SpeedInsights />
              <Analytics />
              <DevTools />
              <WebVitals />
            </ThemeProvider>
          </QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
