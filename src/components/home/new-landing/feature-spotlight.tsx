"use client";

import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

type FeatureSpotlightProps = {
  subtitle: string;
  title: string;
  description: string;
  highlights: { label: string; description: string }[];
  imageSrcDark: string;
  imageSrcLight: string;
  imageAlt: string;
  imagePosition: "left" | "right";
};

export function FeatureSpotlight({
  subtitle,
  title,
  description,
  highlights,
  imageSrcDark,
  imageSrcLight,
  imageAlt,
  imagePosition,
}: FeatureSpotlightProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-12 lg:max-w-none lg:grid-cols-2">
          {/* Text column */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-primary text-sm font-semibold uppercase tracking-wider">
              {subtitle}
            </p>
            <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              {title}
            </h2>
            <p className="mt-6 text-balance text-lg leading-8 text-gray-600 dark:text-gray-400">
              {description}
            </p>

            <ul className="mt-8 space-y-4">
              {highlights.map((item) => (
                <li key={item.label} className="flex gap-x-3">
                  <CheckCircleIcon
                    className="text-primary mt-1 h-5 w-5 flex-none"
                    aria-hidden="true"
                  />
                  <span className="text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {item.label}
                    </span>{" "}
                    {item.description}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Image column */}
          <motion.div
            className={
              imagePosition === "left" ? "lg:order-first" : "lg:order-last"
            }
            initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/50 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <Image
                src={imageSrcDark}
                alt={imageAlt}
                className="hidden w-full rounded-xl dark:block"
                width={2432}
                height={1442}
              />
              <Image
                src={imageSrcLight}
                alt={imageAlt}
                className="block w-full rounded-xl dark:hidden"
                width={2432}
                height={1442}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
