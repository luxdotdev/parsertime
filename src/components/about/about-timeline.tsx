"use client";

import { motion, useReducedMotion } from "framer-motion";

type Milestone = {
  date: string;
  title: string;
  description: string;
};

type AboutTimelineProps = {
  title: string;
  milestones: Milestone[];
};

export function AboutTimeline({ title, milestones }: AboutTimelineProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-24 sm:py-32" aria-labelledby="timeline-heading">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.h2
          id="timeline-heading"
          className="text-3xl font-bold tracking-tight text-balance text-gray-900 sm:text-4xl dark:text-white"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          {title}
        </motion.h2>

        <ol className="relative mt-12 ml-4 space-y-12 border-l-2 border-dashed border-gray-200 dark:border-white/10">
          {/* Animated line overlay that draws progressively */}
          <motion.div
            className="pointer-events-none absolute inset-y-0 left-[-2px] w-0.5 origin-top border-l-2 border-dashed border-gray-200 dark:border-white/10"
            initial={prefersReducedMotion ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{ willChange: "transform" }}
            aria-hidden="true"
          />

          {milestones.map((milestone, i) => (
            <motion.li
              key={milestone.date}
              className="relative pl-8"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.15,
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {/* Milestone dot — centered on the border-l line */}
              <div
                className="bg-primary absolute top-1.5 left-[-7px] h-3 w-3 rounded-full ring-4 ring-white dark:ring-black"
                aria-hidden="true"
              />

              <p className="text-primary text-sm font-semibold">
                {milestone.date}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {milestone.title}
              </h3>
              <p className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">
                {milestone.description}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
