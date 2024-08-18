import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { Suspense } from "react";
import { StaffToolbar } from "@/components/staff-toolbar";
import { cn } from "@/lib/utils";
import { CommandMenuProvider } from "@/components/command-menu-provider";
import { CommandDialogMenu } from "@/components/command-menu";
import { auth } from "@/lib/auth";
import { getUser } from "@/data/user-dto";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export const metadata: Metadata = {
  title: "Parsertime",
  description: "Parsertime is a tool for analyzing Overwatch scrims.",
  metadataBase: new URL("https://parsertime.app"),
  openGraph: {
    title: `Parsertime`,
    description: `Parsertime is a tool for analyzing Overwatch scrims.`,
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
    locale: "en_US",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  let user = null;

  const locale = await getLocale();
  const messages = await getMessages();

  if (session) {
    user = await getUser(session.user.email);
  }

  return (
    <html lang={locale} className="h-full">
      <body className={cn(GeistSans.className, "h-full")}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <CommandMenuProvider>
              {children}
              <CommandDialogMenu user={user} />
            </CommandMenuProvider>
            <Toaster />
            <SpeedInsights />
            <Analytics />
            <Suspense>
              <StaffToolbar />
            </Suspense>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
