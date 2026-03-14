"use client";

import {
  AcademicCapIcon,
  HandRaisedIcon,
  PresentationChartLineIcon,
  RocketLaunchIcon,
  ServerStackIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import { motion, useReducedMotion } from "framer-motion";
import type { ComponentType, SVGProps } from "react";

const iconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  PresentationChartLineIcon,
  HandRaisedIcon,
  UserGroupIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  ServerStackIcon,
};

type Value = {
  name: string;
  description: string;
  icon: string;
};

type AboutValuesProps = {
  title: string;
  subtitle: string;
  values: Value[];
};

export function AboutValues({ title, subtitle, values }: AboutValuesProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-24 sm:py-32" aria-labelledby="values-heading">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            id="values-heading"
            className="text-3xl font-bold tracking-tight text-balance text-gray-900 sm:text-4xl dark:text-white"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {title}
          </motion.h2>
          <motion.p
            className="mt-4 text-lg leading-8 text-balance text-gray-600 dark:text-gray-400"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: 0.1,
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            {subtitle}
          </motion.p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {values.map((value, i) => (
            <motion.div
              key={value.name}
              className="group rounded-2xl border border-gray-200 bg-white/50 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <div className="transition-transform duration-150 ease-out hover:translate-y-[-2px]">
                <div className="bg-primary/10 inline-flex rounded-lg p-2">
                  {(() => {
                    const Icon = iconMap[value.icon];
                    return Icon ? (
                      <Icon
                        className="text-primary h-6 w-6"
                        aria-hidden="true"
                      />
                    ) : null;
                  })()}
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                  {value.name}
                </h3>
                <p className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">
                  {value.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
