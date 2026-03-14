"use client";

import { Button } from "@/components/ui/button";
import { track } from "@vercel/analytics";
import { motion, useReducedMotion } from "framer-motion";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuroraBackground } from "./aurora-background";
import { useFirstVisit } from "./use-first-visit";

type HeroProps = {
  title: string;
  description: string;
  getStarted: string;
  liveDemo: string;
  latestUpdatesLabel: string;
  latestUpdatesTitle: string;
  latestUpdatesUrl: string;
  teamCount: number;
  isLoggedIn: boolean;
};

const navLinks = [
  { label: "Features", href: "#features" as Route },
  { label: "Pricing", href: "/pricing" as Route },
  { label: "Stats", href: "#stats" as Route },
  { label: "About", href: "/about" as Route },
];

export function Hero({
  title,
  description,
  getStarted,
  liveDemo,
  latestUpdatesLabel,
  latestUpdatesTitle,
  latestUpdatesUrl,
  teamCount,
  isLoggedIn,
}: HeroProps) {
  const isFirstVisit = useFirstVisit();
  const prefersReducedMotion = useReducedMotion();

  const shouldAnimate = isFirstVisit && !prefersReducedMotion;

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="relative bg-white p-3 sm:p-4 dark:bg-black">
      {/* Inset card with aurora */}
      <div className="relative min-h-[calc(100vh+4rem)] overflow-hidden rounded-3xl sm:min-h-[calc(100vh+4rem)]">
        {/* Aurora WebGL background */}
        <div className="absolute inset-0">
          <AuroraBackground />
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-black/40 dark:bg-black/50" />
        </div>

        {/* Content */}
        <div className="relative z-[5] flex min-h-[calc(100vh+4rem)] flex-col sm:min-h-[calc(100vh+4rem)]">
          {/* Nav */}
          <nav className="flex items-center justify-between px-8 pt-8 sm:px-12 sm:pt-10">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/parsertime.png"
                alt="Parsertime"
                width={32}
                height={32}
                className="h-8 w-8 invert dark:invert"
              />
              <span className="text-lg font-semibold text-white">
                Parsertime
              </span>
            </Link>
            <div className="hidden items-center gap-8 sm:flex">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                >
                  <Link
                    href={link.href}
                    className="group relative text-sm text-white/70 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    onClick={() => track("nav-click", { label: link.label })}
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all group-hover:w-full" />
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="sm:hidden">
              <Button size="sm" asChild>
                <Link href={isLoggedIn ? "/dashboard" : "/sign-up"}>
                  {isLoggedIn ? "Dashboard" : getStarted}
                </Link>
              </Button>
            </div>
          </nav>

          {/* Hero content */}
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            {/* Latest updates badge */}
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Link
                href={latestUpdatesUrl as Route}
                target="_blank"
                className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10"
                onClick={() =>
                  track("badge-click", { title: latestUpdatesTitle })
                }
              >
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                  {latestUpdatesLabel}
                </span>
                <span>{latestUpdatesTitle}</span>
              </Link>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="max-w-4xl font-[family-name:var(--font-instrument-serif)] text-[clamp(2.5rem,8vmax,6rem)] leading-[0.95] font-normal text-balance text-white"
              variants={fadeUp}
              initial={shouldAnimate ? "hidden" : false}
              animate="visible"
              transition={{
                delay: 0.2,
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="mt-6 max-w-xl text-lg leading-relaxed text-balance text-white/80"
              variants={fadeUp}
              initial={shouldAnimate ? "hidden" : false}
              animate="visible"
              transition={{
                delay: 0.35,
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {description}
            </motion.p>

            {/* Social proof */}
            <motion.p
              className="mt-4 text-sm text-white/50"
              variants={fadeUp}
              initial={shouldAnimate ? "hidden" : false}
              animate="visible"
              transition={{
                delay: 0.42,
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              Trusted by {teamCount}+ teams
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="mt-10 flex items-center gap-4"
              variants={fadeUp}
              initial={shouldAnimate ? "hidden" : false}
              animate="visible"
              transition={{
                delay: 0.5,
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <Button
                size="lg"
                onClick={() =>
                  track("cta-click", {
                    location: "hero",
                    variant: "new-landing-page",
                    authenticated: isLoggedIn ? "true" : "false",
                  })
                }
                asChild
              >
                <Link href={isLoggedIn ? "/dashboard" : "/sign-up"}>
                  {isLoggedIn ? "Go to Dashboard" : getStarted}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
                onClick={() =>
                  track("cta-click", {
                    location: "hero-demo",
                    variant: "new-landing-page",
                    authenticated: isLoggedIn ? "true" : "false",
                  })
                }
                asChild
              >
                <Link href="/demo">
                  {liveDemo} <span aria-hidden="true">→</span>
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Spacer between CTAs and screenshot */}
          <div className="h-16 sm:h-24" />

          {/* Hero screenshot - peek from bottom */}
          <motion.div
            className="relative mx-auto -mb-16 w-full max-w-5xl px-8 sm:-mb-24 sm:px-12"
            initial={shouldAnimate ? { opacity: 0, y: 40, scale: 0.97 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.4,
              duration: 0.7,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <div className="overflow-hidden rounded-t-2xl">
              <Image
                src="/player-page.png"
                alt="Parsertime player analytics dashboard showing skill ratings and performance charts"
                width={2432}
                height={1442}
                className="hidden w-full dark:block"
                priority
              />
              <Image
                src="/player-page-light.png"
                alt="Parsertime player analytics dashboard showing skill ratings and performance charts"
                width={2432}
                height={1442}
                className="block w-full dark:hidden"
                priority
              />
            </div>
            {/* Gradient fade at the bottom */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white dark:from-black" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
