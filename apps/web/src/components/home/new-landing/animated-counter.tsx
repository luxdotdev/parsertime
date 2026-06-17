"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
  const prefersReducedMotion = useReducedMotion();
  const [inView, setInView] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // IntersectionObserver callbacks only fire when the browser produces
    // render frames, which headless and occluded windows may never do.
    // Check the initial position synchronously so above-the-fold counters
    // always run, and fall back to the observer for below-fold scroll.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || value === 0) return;

    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });

    return () => controls.stop();
  }, [inView, value, duration, prefersReducedMotion]);

  return (
    <span ref={ref}>
      {display.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
