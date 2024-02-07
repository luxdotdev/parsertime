import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ParserDataProvider } from "@/lib/parser-context";
import { Toaster } from "@/components/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { CommandDialogMenu } from "@/components/command-menu";
import { Suspense } from "react";
import { StaffToolbar } from "@/components/staff-toolbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Parsertime",
  description: "Parsertime is a tool for analyzing Overwatch scrims.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ParserDataProvider>
            {children}
            <Suspense>
              <StaffToolbar />
            </Suspense>
          </ParserDataProvider>
          <Toaster />
          <SpeedInsights />
          <Analytics />
          <CommandDialogMenu />
        </ThemeProvider>
      </body>
    </html>
  );
}
