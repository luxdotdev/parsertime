"use client";

import { motion, useReducedMotion } from "framer-motion";

type PricingHeroProps = {
  title: string;
  subtitle: string;
};

export function PricingHero({ title, subtitle }: PricingHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      className="relative isolate overflow-hidden py-24 sm:py-32"
      aria-label={title}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 dark:from-indigo-500/20 dark:to-cyan-500/20" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white dark:from-black" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-black" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h1
            className="font-[family-name:var(--font-instrument-serif)] text-4xl tracking-tight text-balance text-gray-900 italic sm:text-6xl dark:text-white"
            style={{ willChange: "transform" }}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            {title}
          </motion.h1>
          <motion.p
            className="mt-6 text-lg leading-8 text-balance text-gray-600 dark:text-gray-400"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.15,
              duration: 0.5,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            {subtitle}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
