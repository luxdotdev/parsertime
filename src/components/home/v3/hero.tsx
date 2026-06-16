"use client";

import { AnimatedCounter } from "@/components/home/new-landing/animated-counter";
import { useFirstVisit } from "@/components/home/new-landing/use-first-visit";
import { Button } from "@/components/ui/button";
import { track } from "@vercel/analytics";
import { motion, useReducedMotion } from "framer-motion";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

type HeroStat = {
  id: string;
  name: string;
  value: number;
  suffix: string;
};

type HeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  getStarted: string;
  liveDemo: string;
  trustedBy: string;
  liveData: string;
  latestUpdatesLabel: string;
  latestUpdatesTitle?: string;
  latestUpdatesUrl?: string;
  stats: HeroStat[];
  isLoggedIn: boolean;
};

const navLinks = [
  { label: "Features", href: "#features" as Route },
  { label: "Pricing", href: "/pricing" as Route },
  { label: "Stats", href: "#stats" as Route },
  { label: "About", href: "/about" as Route },
];

/** Percentile bar drawn inside the floating card. */
function PercentileBar({
  percent,
  animate,
}: {
  percent: number;
  animate: boolean;
}) {
  return (
    <div
      className="bg-muted h-1 w-36 overflow-hidden rounded-full"
      aria-hidden="true"
    >
      <motion.div
        className="bg-primary h-full origin-left rounded-full"
        style={{ width: `${percent}%` }}
        initial={animate ? { scaleX: 0 } : false}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.1, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/**
 * Floating product artifact. Entrance is staggered; afterwards the card
 * drifts gently unless the user prefers reduced motion.
 */
function FloatingCard({
  className,
  delay,
  appear,
  drift,
  children,
}: {
  className: string;
  delay: number;
  appear: boolean;
  drift: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={`absolute ${className}`}
      initial={appear ? { opacity: 0, y: 16, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden="true"
    >
      <motion.div
        className="bg-card ring-foreground/10 rounded-lg px-4 py-3 shadow-lg ring-1"
        animate={drift ? { y: [0, -6, 0] } : undefined}
        transition={
          drift
            ? {
                delay: delay + 1,
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : undefined
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Hero({
  eyebrow,
  title,
  description,
  getStarted,
  liveDemo,
  trustedBy,
  liveData,
  latestUpdatesLabel,
  latestUpdatesTitle,
  latestUpdatesUrl,
  stats,
  isLoggedIn,
}: HeroProps) {
  const isFirstVisit = useFirstVisit();
  const prefersReducedMotion = useReducedMotion();

  const shouldAnimate = isFirstVisit && !prefersReducedMotion;
  const drift = !prefersReducedMotion;

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  function reveal(delay: number) {
    return {
      variants: fadeUp,
      initial: shouldAnimate ? ("hidden" as const) : false,
      animate: "visible" as const,
      transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    };
  }

  return (
    <section className="border-border border-b">
      {/* Nav */}
      <nav className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/parsertime.png"
              alt="Parsertime"
              width={28}
              height={28}
              className="h-7 w-7 dark:invert"
            />
            <span className="text-base font-semibold">Parsertime</span>
          </Link>
          <div className="hidden items-center gap-8 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
                onClick={() => track("nav-click", { label: link.label })}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Button size="sm" asChild>
            <Link href={isLoggedIn ? "/dashboard" : "/sign-up"}>
              {isLoggedIn ? "Dashboard" : getStarted}
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-6 pt-14 pb-16 sm:pt-20 sm:pb-20 lg:px-8">
          <div className="grid items-center gap-x-12 gap-y-14 lg:grid-cols-2">
            {/* Copy column */}
            <div>
              {latestUpdatesTitle && latestUpdatesUrl ? (
                <motion.div {...reveal(0)}>
                  <Link
                    href={latestUpdatesUrl as Route}
                    target="_blank"
                    className="border-border hover:bg-muted mb-10 inline-flex items-center gap-3 rounded-md border px-3 py-1.5 transition-colors"
                    onClick={() =>
                      track("badge-click", { title: latestUpdatesTitle })
                    }
                  >
                    <span className="text-primary font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                      {latestUpdatesLabel}
                    </span>
                    <span className="text-foreground text-sm">
                      {latestUpdatesTitle}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-muted-foreground text-sm"
                    >
                      →
                    </span>
                  </Link>
                </motion.div>
              ) : null}

              <motion.p
                className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase"
                {...reveal(0.05)}
              >
                <span
                  aria-hidden="true"
                  className="bg-primary mr-3 inline-block h-px w-6 align-middle"
                />
                {eyebrow}
              </motion.p>

              <motion.h1
                className="mt-4 text-[clamp(2.375rem,1.3rem+2.9vw,3.5rem)] leading-[1.05] font-semibold tracking-tight text-balance"
                {...reveal(0.12)}
              >
                {title}
              </motion.h1>

              <motion.p
                className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed text-balance"
                {...reveal(0.2)}
              >
                {description}
              </motion.p>

              <motion.div
                className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-4"
                {...reveal(0.28)}
              >
                <Button
                  size="lg"
                  className="group shadow-primary/50 hover:shadow-primary/70 relative overflow-hidden shadow-[0_0_24px_-6px] transition-shadow hover:shadow-[0_0_32px_-2px]"
                  onClick={() =>
                    track("cta-click", {
                      location: "hero",
                      variant: "v3-landing-page",
                      authenticated: isLoggedIn ? "true" : "false",
                    })
                  }
                  asChild
                >
                  <Link href={isLoggedIn ? "/dashboard" : "/sign-up"}>
                    <span className="relative z-10">
                      {isLoggedIn ? "Go to Dashboard" : getStarted}
                    </span>
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden"
                    />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    track("cta-click", {
                      location: "hero-demo",
                      variant: "v3-landing-page",
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

              <motion.p
                className="text-muted-foreground mt-6 text-sm"
                {...reveal(0.34)}
              >
                {trustedBy}
              </motion.p>
            </div>

            {/* Product showcase column */}
            <motion.div
              className="relative lg:pl-2"
              initial={shouldAnimate ? { opacity: 0, y: 28 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3,
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* Near-field aura behind the browser window */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-16 -inset-y-12 lg:-inset-x-24 lg:-inset-y-20"
                style={{
                  background:
                    "radial-gradient(50% 50% at 50% 48%, color-mix(in oklab, var(--primary) 28%, transparent) 0%, color-mix(in oklab, var(--primary) 10%, transparent) 60%, transparent 80%)",
                }}
              />
              <div
                className="bg-card relative overflow-hidden rounded-xl lg:[transform:perspective(1600px)_rotateY(-5deg)_rotateX(1.5deg)]"
                style={{
                  boxShadow:
                    "0 0 0 1px color-mix(in oklab, var(--primary) 50%, transparent), 0 0 36px -6px color-mix(in oklab, var(--primary) 65%, transparent), 0 0 110px -16px color-mix(in oklab, var(--primary) 50%, transparent), 0 28px 90px -28px rgb(0 0 0 / 0.55)",
                }}
              >
                <div className="border-border flex items-center gap-2 border-b px-4 py-2.5">
                  <span
                    aria-hidden="true"
                    className="bg-muted-foreground/30 h-2.5 w-2.5 rounded-full"
                  />
                  <span
                    aria-hidden="true"
                    className="bg-muted-foreground/30 h-2.5 w-2.5 rounded-full"
                  />
                  <span
                    aria-hidden="true"
                    className="bg-muted-foreground/30 h-2.5 w-2.5 rounded-full"
                  />
                  <span className="text-muted-foreground ml-3 font-mono text-[10px] tracking-[0.18em] uppercase">
                    parsertime.app
                  </span>
                </div>
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

              {/* Floating product artifacts */}
              <FloatingCard
                className="-bottom-8 -left-4 hidden sm:block lg:-left-10"
                delay={0.7}
                appear={shouldAnimate}
                drift={drift}
              >
                <p className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                  Eliminations · Sojourn
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <p className="font-mono text-2xl leading-none font-semibold tabular-nums">
                    28.38
                  </p>
                  <p className="text-muted-foreground font-mono text-xs">
                    per 10 min
                  </p>
                </div>
                <div className="mt-2.5">
                  <PercentileBar percent={99} animate={shouldAnimate} />
                </div>
                <p className="text-primary mt-1.5 font-mono text-xs tabular-nums">
                  99th percentile (+2.92σ)
                </p>
              </FloatingCard>

              <FloatingCard
                className="-top-6 -right-2 hidden sm:block lg:-right-6"
                delay={0.9}
                appear={shouldAnimate}
                drift={drift}
              >
                <p className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                  Hero SR · Sojourn
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <p className="font-mono text-2xl leading-none font-semibold tabular-nums">
                    4143
                  </p>
                  <p className="text-primary font-mono text-xs tabular-nums">
                    ▲ 4349 on elims
                  </p>
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs">
                  First pick in 25% of fights
                </p>
              </FloatingCard>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Live stat ribbon */}
      <div id="stats" className="border-border scroll-mt-20 border-t">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-6 py-2.5 lg:px-8">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
            <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
          </span>
          <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
            {liveData}
          </span>
        </div>
      </div>
      <div className="border-border border-t" />
      <motion.dl
        className="border-border mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4"
        aria-label="Platform statistics"
        {...reveal(0.36)}
      >
        {stats.map((stat, i) => (
          <div
            key={stat.id}
            className={`border-border flex flex-col gap-1 px-6 py-5 lg:px-8 ${
              i % 2 === 1 ? "border-l" : ""
            } ${i >= 2 ? "border-t lg:border-t-0" : ""} ${
              i >= 1 ? "lg:border-l" : ""
            }`}
          >
            <dt className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {stat.name}
            </dt>
            <dd
              className={`font-mono text-2xl leading-none font-semibold tabular-nums sm:text-3xl ${
                i === 0 ? "text-primary" : ""
              }`}
            >
              {stat.id === "uptime" ? (
                stat.suffix
              ) : (
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={1.2}
                />
              )}
            </dd>
          </div>
        ))}
      </motion.dl>
    </section>
  );
}
