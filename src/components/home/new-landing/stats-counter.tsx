"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { AnimatedCounter } from "./animated-counter";

type Stat = {
  id: string;
  name: string;
  value: number;
  suffix: string;
};

type StatsCounterProps = {
  subtitle: string;
  title: string;
  description: string;
  stats: Stat[];
};

function GrowthChart() {
  const pathId = useId();

  return (
    <div className="pointer-events-none relative mt-10 h-48 sm:h-56">
      <div className="absolute bottom-0 left-1/2 w-[150vw] max-w-7xl -translate-x-1/2">
        <svg
          className="h-[320px] w-full fill-gray-900/[0.025] stroke-gray-900/40 dark:fill-white/[0.025] dark:stroke-white/40"
          viewBox="0 0 1200 400"
          preserveAspectRatio="none"
        >
          <defs>
            <clipPath id={pathId}>
              <path d="M 0 400 L 0 383 C 396 362.79, 804 264.32, 1200 60 L 1200 60 L 1200 400 Z" />
            </clipPath>
          </defs>
          <path
            d="M 0 400 L 0 383 C 396 362.79, 804 264.32, 1200 60 L 1200 60 L 1200 400 Z"
            stroke="none"
          />
          <g strokeWidth="1" strokeDasharray="4 3" clipPath={`url(#${pathId})`}>
            {Array.from({ length: 14 }, (_, i) => {
              const x = i === 0 ? 0.5 : i === 13 ? 1199.5 : (1200 / 13) * i;
              return (
                <line
                  key={i}
                  x1={x}
                  y1="400"
                  x2={x}
                  y2="0"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>
          <path
            d="M 0 383 C 396 362.79, 804 264.32, 1200 60"
            fill="none"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}

export function StatsCounter({
  subtitle,
  title,
  description,
  stats,
}: StatsCounterProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="stats"
      aria-labelledby="stats-heading"
      className="mx-auto max-w-7xl overflow-hidden px-6 py-32 sm:py-48 lg:px-8"
    >
      {/* Header — left-aligned */}
      <div className="max-w-2xl">
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
          id="stats-heading"
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

      {/* Stats — 2×2 grid flowing into chart */}
      <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-10 sm:mt-20 sm:auto-cols-fr sm:grid-flow-col-dense lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.id}
            className="border-l border-gray-200 pl-6 dark:border-white/20"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <dd className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
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
            <dt className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
              {stat.name}
            </dt>
          </motion.div>
        ))}
      </div>

      {/* Growth chart */}
      <GrowthChart />
    </section>
  );
}
