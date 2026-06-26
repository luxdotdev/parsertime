"use client";

import { track } from "@vercel/analytics";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useCallback, useState } from "react";

type Step = {
  id: number;
  title: string;
  description: string;
  imageSrcDark: string;
  imageSrcLight: string;
  imageAlt: string;
};

type HowItWorksProps = {
  title: string;
  titleAccent: string;
  steps: Step[];
};

export function HowItWorks({ title, titleAccent, steps }: HowItWorksProps) {
  const [activeStep, setActiveStep] = useState(1);
  const currentStep = steps.find((s) => s.id === activeStep)!;
  const prefersReducedMotion = useReducedMotion();

  const handleStepClick = useCallback((step: Step) => {
    setActiveStep(step.id);
    track("step-click", { step: String(step.id), title: step.title });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = steps.findIndex((s) => s.id === activeStep);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = steps[(currentIndex + 1) % steps.length];
        setActiveStep(next.id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = steps[(currentIndex - 1 + steps.length) % steps.length];
        setActiveStep(prev.id);
      }
    },
    [activeStep, steps]
  );

  return (
    <section
      className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8"
      aria-label="How it works"
    >
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left — stepper */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl dark:text-white">
            {title}{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] italic">
              {titleAccent}
            </span>
          </h2>

          <div
            className="relative mt-8 border-l-2 border-dashed border-gray-200 dark:border-white/10"
            role="tablist"
            aria-orientation="vertical"
          >
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={activeStep === step.id}
                aria-controls={`step-panel-${step.id}`}
                id={`step-tab-${step.id}`}
                className="relative w-full cursor-pointer text-left"
                onClick={() => handleStepClick(step)}
                onKeyDown={handleKeyDown}
              >
                {/* Active indicator bar */}
                <motion.div
                  className="bg-primary absolute top-0 bottom-0 left-0 -ml-px w-0.5"
                  initial={false}
                  animate={{
                    opacity: activeStep === step.id ? 1 : 0,
                    scaleY: activeStep === step.id ? 1 : 0,
                  }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ originY: 0.5 }}
                />

                <div className="py-3 pl-6">
                  <h3
                    className={`text-base font-semibold transition-colors duration-200 sm:text-lg ${
                      activeStep === step.id
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {step.title}
                  </h3>

                  <motion.div
                    initial={false}
                    animate={{
                      height: activeStep === step.id ? "auto" : 0,
                      opacity: activeStep === step.id ? 1 : 0,
                      marginTop: activeStep === step.id ? 8 : 0,
                    }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="max-w-md text-sm leading-relaxed text-gray-500 sm:text-base dark:text-gray-400">
                      {step.description}
                    </p>
                  </motion.div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Right — screenshot */}
        <motion.div
          className="relative flex justify-center"
          initial={prefersReducedMotion ? false : { opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div
            role="tabpanel"
            id={`step-panel-${activeStep}`}
            aria-labelledby={`step-tab-${activeStep}`}
            className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white/50 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={
                  prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }
                }
                animate={{ opacity: 1, scale: 1 }}
                exit={
                  prefersReducedMotion ? undefined : { opacity: 0, scale: 0.97 }
                }
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <Image
                  src={currentStep.imageSrcDark}
                  alt={currentStep.imageAlt}
                  className="hidden w-full rounded-xl dark:block"
                  width={2432}
                  height={1442}
                />
                <Image
                  src={currentStep.imageSrcLight}
                  alt={currentStep.imageAlt}
                  className="block w-full rounded-xl dark:hidden"
                  width={2432}
                  height={1442}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
