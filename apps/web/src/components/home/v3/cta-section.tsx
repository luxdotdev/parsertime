"use client";

import { Button } from "@/components/ui/button";
import { track } from "@vercel/analytics";
import type { Route } from "next";
import Link from "next/link";

type CtaSectionProps = {
  subtitle: string;
  title: string;
  description: string;
  getStarted: string;
  learnMore: string;
  isLoggedIn: boolean;
  learnMoreHref?: string;
};

export function CtaSection({
  subtitle,
  title,
  description,
  getStarted,
  learnMore,
  isLoggedIn,
  learnMoreHref = "/about",
}: CtaSectionProps) {
  return (
    <section
      className="relative overflow-hidden py-28 sm:py-36"
      aria-label="Call to action"
    >
      {/* Closing bloom: the page ends on the same light the hero opened with */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[120%]"
        style={{
          background:
            "radial-gradient(45% 65% at 50% 100%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 75%)",
        }}
      />
      <div className="relative mx-auto max-w-2xl px-6 text-center lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {subtitle}
          <br />
          {title}
        </h2>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed text-balance">
          {description}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button
            size="lg"
            className="group shadow-primary/50 hover:shadow-primary/70 relative overflow-hidden shadow-[0_0_24px_-6px] transition-shadow hover:shadow-[0_0_32px_-2px]"
            onClick={() =>
              track("cta-click", {
                location: "footer-cta",
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
          <Link
            href={learnMoreHref as Route}
            className="hover:text-muted-foreground text-sm font-semibold transition-colors"
          >
            {learnMore} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
