import { CommandDialogMenu } from "@/components/command-menu";
import { CommandMenuProvider } from "@/components/command-menu-provider";
import { StaffToolbar } from "@/components/staff-toolbar";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { QueryProvider } from "@/lib/query";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

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

  if (session) {
    user = await getUser(session.user.email);
  }

  return (
    <html lang="en" className="h-full">
      <body className={cn(GeistSans.className, "h-full")}>
        <QueryProvider>
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
        </QueryProvider>
      </body>
    </html>
  );
}
