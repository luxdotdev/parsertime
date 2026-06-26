"use client";

import { motion, useReducedMotion } from "framer-motion";

type AboutStoryProps = {
  title: string;
  paragraphs: string[];
};

export function AboutStory({ title, paragraphs }: AboutStoryProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-16 sm:py-24" aria-labelledby="story-heading">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <motion.h2
          id="story-heading"
          className="text-3xl font-bold tracking-tight text-balance text-gray-900 sm:text-4xl dark:text-white"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {title}
        </motion.h2>
        <div className="mt-8 space-y-6">
          {paragraphs.map((paragraph, i) => (
            <motion.p
              key={paragraph.slice(0, 40)}
              className="text-lg leading-8 text-gray-600 dark:text-gray-400"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {paragraph}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}
