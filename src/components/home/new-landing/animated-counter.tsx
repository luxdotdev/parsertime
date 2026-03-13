"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useRef } from "react";

type AnimatedCounterProps = {
  value: number;
  suffix?: string;
  duration?: number;
};

export function AnimatedCounter({
  value,
  suffix = "",
  duration = 1.2,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) =>
    Math.round(v).toLocaleString("en-US")
  );

  useEffect(() => {
    if (!inView) return;

    if (prefersReducedMotion) {
      motionValue.set(value);
      return;
    }

    motionValue.set(0);
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
    });

    return () => controls.stop();
  }, [inView, value, duration, motionValue, prefersReducedMotion]);

  return (
    <span ref={ref}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
