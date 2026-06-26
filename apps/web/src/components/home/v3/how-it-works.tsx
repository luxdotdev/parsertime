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
  steps: Step[];
};

export function HowItWorks({ title, steps }: HowItWorksProps) {
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
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h2>

          <div
            className="border-border relative mt-10 border-l"
            role="tablist"
            aria-orientation="vertical"
          >
            {steps.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
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
                      opacity: isActive ? 1 : 0,
                      scaleY: isActive ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    style={{ originY: 0.5 }}
                  />

                  <div className="py-4 pl-6">
                    <div className="flex items-baseline gap-3">
                      <span
                        className={`font-mono text-[10px] tracking-[0.18em] transition-colors duration-200 ${
                          isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {String(step.id).padStart(2, "0")}
                      </span>
                      <h3
                        className={`text-base font-semibold transition-colors duration-200 sm:text-lg ${
                          isActive ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </h3>
                    </div>

                    <motion.div
                      initial={false}
                      animate={{
                        height: isActive ? "auto" : 0,
                        opacity: isActive ? 1 : 0,
                        marginTop: isActive ? 8 : 0,
                      }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </motion.div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — screenshot */}
        <div className="relative flex justify-center">
          <div
            role="tabpanel"
            id={`step-panel-${activeStep}`}
            aria-labelledby={`step-tab-${activeStep}`}
            className="bg-card ring-foreground/10 relative w-full overflow-hidden rounded-xl shadow-xs ring-1"
          >
            <div className="border-border flex items-center gap-2 border-b px-4 py-2.5">
              <span
                aria-hidden="true"
                className="bg-muted-foreground/30 h-2.5 w-2.5 rounded-full"
              />
              <span
                aria-hidden="true"
                className="bg-muted-foreground/30 h-2.5 w-2.5 rounded-full"
              />
              <span
                aria-hidden="true"
                className="bg-muted-foreground/30 h-2.5 w-2.5 rounded-full"
              />
              <span className="text-muted-foreground ml-3 font-mono text-[10px] tracking-[0.18em] uppercase">
                parsertime.app
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Image
                  src={currentStep.imageSrcDark}
                  alt={currentStep.imageAlt}
                  className="hidden w-full dark:block"
                  width={2432}
                  height={1442}
                />
                <Image
                  src={currentStep.imageSrcLight}
                  alt={currentStep.imageAlt}
                  className="block w-full dark:hidden"
                  width={2432}
                  height={1442}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
