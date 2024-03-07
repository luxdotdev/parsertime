import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ParserDataProvider } from "@/lib/parser-context";
import { Toaster } from "@lux/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { CommandDialogMenu } from "@/components/command-menu";
import { Suspense } from "react";
import { StaffToolbar } from "@/components/staff-toolbar";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={cn(inter.className, "h-full")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ParserDataProvider>{children}</ParserDataProvider>
          <Toaster />
          <SpeedInsights />
          <Analytics />
          <CommandDialogMenu />
          <Suspense>
            <StaffToolbar />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
