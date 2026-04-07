"use client";

import { StarIcon } from "@heroicons/react/20/solid";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

type TestimonialProps = {
  starRating: string;
  quote: string;
  author: string;
  role: string;
};

export function Testimonial({
  starRating,
  quote,
  author,
  role,
}: TestimonialProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      className="px-6 py-24 sm:py-32 lg:px-8"
      aria-label="Customer testimonial"
    >
      <motion.figure
        className="mx-auto max-w-2xl"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <p className="sr-only">{starRating}</p>
        <div className="text-primary flex gap-x-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon
              // oxlint-disable-next-line react/no-array-index-key
              key={`star-${i}`}
              className="h-5 w-5 flex-none"
              aria-hidden="true"
            />
          ))}
        </div>
        <blockquote className="mt-10 border-l-4 border-indigo-500/50 pl-6 text-xl leading-8 font-semibold tracking-tight text-gray-900 sm:text-2xl sm:leading-9 dark:text-white">
          <p>{quote}</p>
        </blockquote>
        <figcaption className="mt-10 flex items-center gap-x-6">
          <Image
            className="h-12 w-12 rounded-full bg-gray-50 dark:bg-zinc-900"
            src="/marketing/coy.png"
            alt="Photo of coy, Manager for o7 Esports"
            width={48}
            height={48}
          />
          <div className="text-sm leading-6">
            <div className="font-semibold text-gray-900 dark:text-white">
              {author}
            </div>
            <div className="mt-0.5 text-gray-600 dark:text-gray-400">
              {role}
            </div>
          </div>
        </figcaption>
      </motion.figure>
    </section>
  );
}
