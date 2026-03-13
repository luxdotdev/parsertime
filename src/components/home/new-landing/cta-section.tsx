"use client";

import { Button } from "@/components/ui/button";
import { track } from "@vercel/analytics";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

type CtaSectionProps = {
  subtitle: string;
  title: string;
  description: string;
  getStarted: string;
  learnMore: string;
  isLoggedIn: boolean;
};

export function CtaSection({
  subtitle,
  title,
  description,
  getStarted,
  learnMore,
  isLoggedIn,
}: CtaSectionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden py-32 sm:py-40">
      {/* Gradient background with soft edges */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 dark:from-indigo-500/20 dark:to-cyan-500/20" />
        {/* Fade top edge */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white dark:from-black" />
        {/* Fade bottom edge */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-black" />
      </div>

      <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
        <motion.h2
          className="text-3xl font-bold tracking-tight text-balance text-gray-900 sm:text-4xl dark:text-white"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {subtitle}
          <br />
          {title}
        </motion.h2>
        <motion.p
          className="mx-auto mt-6 max-w-xl text-lg leading-8 text-balance text-gray-600 dark:text-gray-400"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          {description}
        </motion.p>
        <motion.div
          className="mt-10 flex items-center justify-center gap-x-6"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Button
            size="lg"
            onClick={() =>
              track("cta-click", {
                location: "footer-cta",
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
          <Link
            href="/about"
            className="text-sm leading-6 font-semibold text-gray-900 dark:text-white"
          >
            {learnMore} <span aria-hidden="true">→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
