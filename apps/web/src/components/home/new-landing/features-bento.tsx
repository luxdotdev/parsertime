"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

type FeaturesBentoProps = {
  subtitle: string;
  title: string;
  description: string;
  bentoHeadings: {
    dataDecisions: string;
    everyMetric: string;
    noSpreadsheets: string;
    spotChanges: string;
    yourData: string;
  };
  features: {
    builtByCoaches: { name: string; description: string };
    shareWithTeam: { name: string; description: string };
    dataCharts: { name: string; description: string };
    filterStats: { name: string; description: string };
    advancedSecurity: { name: string; description: string };
    fullyCustomizable: { name: string; description: string };
  };
};

export function FeaturesBento({
  subtitle,
  title,
  description,
  bentoHeadings,
  features,
}: FeaturesBentoProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="mx-auto max-w-7xl px-6 py-32 sm:py-48 lg:px-8"
    >
      {/* Section header */}
      <div className="mx-auto max-w-2xl text-center">
        <motion.p
          className="text-primary text-sm font-semibold tracking-wider uppercase"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          {subtitle}
        </motion.p>
        <motion.h2
          id="features-heading"
          className="mt-2 text-3xl font-bold tracking-tight text-balance text-gray-900 sm:text-4xl dark:text-white"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          {title}
        </motion.h2>
        <motion.p
          className="mt-6 text-lg leading-8 text-balance text-gray-600 dark:text-gray-400"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {description}
        </motion.p>
      </div>

      {/* Bento grid */}
      <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* Card 1 — wide: Team Data Charts (screenshot) */}
        <motion.div
          className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white lg:col-span-3 dark:border-white/10 dark:bg-white/[0.03]"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0, duration: 0.5 }}
        >
          <div className="relative h-52 overflow-hidden bg-gray-50 dark:bg-white/[0.02]">
            <Image
              src="/new-killfeed.png"
              alt="Parsertime killfeed visualization showing match events"
              className="hidden object-cover object-top dark:block"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <Image
              src="/new-killfeed-light.png"
              alt="Parsertime killfeed visualization showing match events"
              className="block object-cover object-top dark:hidden"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-[#0a0a0a]" />
          </div>
          <div className="relative p-8 pt-2">
            <p className="text-primary text-sm font-semibold">
              {features.dataCharts.name}
            </p>
            <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {bentoHeadings.dataDecisions}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
              {features.dataCharts.description}
            </p>
          </div>
        </motion.div>

        {/* Card 2 — wide: Built by coaches (screenshot) */}
        <motion.div
          className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white lg:col-span-3 dark:border-white/10 dark:bg-white/[0.03]"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="relative h-52 overflow-hidden bg-gray-50 dark:bg-white/[0.02]">
            <Image
              src="/scrim-overview-card.png"
              alt="Parsertime scrim overview card with match results"
              className="hidden object-cover object-top dark:block"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <Image
              src="/scrim-overview-card-light.png"
              alt="Parsertime scrim overview card with match results"
              className="block object-cover object-top dark:hidden"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-[#0a0a0a]" />
          </div>
          <div className="relative p-8 pt-2">
            <p className="text-primary text-sm font-semibold">
              {features.builtByCoaches.name}
            </p>
            <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {bentoHeadings.everyMetric}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
              {features.builtByCoaches.description}
            </p>
          </div>
        </motion.div>

        {/* Card 3 — Share with team */}
        <motion.div
          className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white lg:col-span-2 dark:border-white/10 dark:bg-white/[0.03]"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="relative h-44 overflow-hidden bg-gray-50 dark:bg-white/[0.02]">
            <Image
              src="/dashboard.png"
              alt="Team dashboard"
              className="hidden object-cover object-top dark:block"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <Image
              src="/dashboard-light.png"
              alt="Team dashboard"
              className="block object-cover object-top dark:hidden"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-[#0a0a0a]" />
          </div>
          <div className="relative p-8 pt-4">
            <p className="text-primary text-sm font-semibold">
              {features.shareWithTeam.name}
            </p>
            <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {bentoHeadings.noSpreadsheets}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
              {features.shareWithTeam.description}
            </p>
          </div>
        </motion.div>

        {/* Card 4 — Filter stats */}
        <motion.div
          className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white lg:col-span-2 dark:border-white/10 dark:bg-white/[0.03]"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="relative h-44 overflow-hidden bg-gray-50 dark:bg-white/[0.02]">
            <Image
              src="/team-swaps.png"
              alt="Hero swap trends"
              className="hidden object-cover object-top dark:block"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <Image
              src="/team-swaps-light.png"
              alt="Hero swap trends"
              className="block object-cover object-top dark:hidden"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-[#0a0a0a]" />
          </div>
          <div className="relative p-8 pt-4">
            <p className="text-primary text-sm font-semibold">
              {features.filterStats.name}
            </p>
            <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {bentoHeadings.spotChanges}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
              {features.filterStats.description}
            </p>
          </div>
        </motion.div>

        {/* Card 5 — Security */}
        <motion.div
          className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white lg:col-span-2 dark:border-white/10 dark:bg-white/[0.03]"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/[0.02]">
            {/* Lock/shield visual */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-white/5">
                <svg
                  className="text-primary h-10 w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              {/* Decorative rings */}
              <div className="absolute -inset-4 rounded-3xl border border-dashed border-gray-200 dark:border-white/5" />
              <div className="absolute -inset-8 rounded-[2rem] border border-dashed border-gray-100 dark:border-white/[0.03]" />
            </div>
          </div>
          <div className="relative p-8 pt-4">
            <p className="text-primary text-sm font-semibold">
              {features.advancedSecurity.name}
            </p>
            <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {bentoHeadings.yourData}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
              {features.advancedSecurity.description}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
