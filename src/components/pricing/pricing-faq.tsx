"use client";

import { motion, useReducedMotion } from "framer-motion";
import type React from "react";

type PricingFaqProps = {
  title: string;
  description: React.ReactNode;
  faqs: { question: string; answer: React.ReactNode }[];
};

export function PricingFaq({ title, description, faqs }: PricingFaqProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-24 sm:py-32" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <motion.h2
              id="faq-heading"
              className="text-2xl leading-10 font-bold tracking-tight text-gray-900 dark:text-white"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {title}
            </motion.h2>
            <motion.p
              className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-400"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              {description}
            </motion.p>
          </div>
          <div className="mt-10 lg:col-span-7 lg:mt-0">
            <dl className="space-y-10">
              {faqs.map((faq, i) => (
                <motion.div
                  key={faq.question}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: i * 0.08,
                    duration: 0.5,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <dt className="text-base leading-7 font-semibold text-gray-900 dark:text-white">
                    {faq.question}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-400">
                    {faq.answer}
                  </dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
