import { CommandDialogMenu } from "@/components/command-menu";
import { CommandMenuProvider } from "@/components/command-menu-provider";
import { DevTools } from "@/components/devtools";
import { BetaBanner } from "@/components/home/beta-banner";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { QueryProvider } from "@/lib/query";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await auth();
  let user = null;

  if (session) {
    user = await getUser(session.user.email);
  }

  return (
    <html lang={locale} className="h-full" suppressHydrationWarning>
      <body className={cn(GeistSans.className, "h-full")}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider messages={messages}>
              <CommandMenuProvider>
                <BetaBanner />
                {children}
                <CommandDialogMenu user={user} />
              </CommandMenuProvider>
            </NextIntlClientProvider>
            <Toaster />
            <SpeedInsights />
            <Analytics />
            <DevTools />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
