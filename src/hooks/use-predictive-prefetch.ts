"use client";

import {
  estimateVelocity,
  isHeadingToward,
  type Sample,
} from "@/lib/predictive-prefetch";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

export type PredictivePrefetchOptions = {
  maxDistance?: number;
  coneAngleDeg?: number;
  minSpeed?: number;
  enabled?: boolean;
};

// Rolling sample window for the velocity estimate.
const SAMPLE_WINDOW_MS = 50;
const MAX_SAMPLES = 6;

/**
 * Prefetch internal links inside `containerRef` when the cursor's trajectory is
 * heading toward them. Pointer-only (fine pointers); keyboard/touch are covered
 * by the links' own hover/focus prefetch. No-ops under Save-Data.
 */
export function usePredictivePrefetch(
  containerRef: RefObject<HTMLElement | null>,
  options: PredictivePrefetchOptions = {}
): void {
  const router = useRouter();
  const {
    maxDistance = 250,
    coneAngleDeg = 30,
    minSpeed = 0.15,
    enabled = true,
  } = options;

  // Latest option values, read without re-subscribing the listener.
  const optsRef = useRef({ maxDistance, coneAngleDeg, minSpeed });
  optsRef.current = { maxDistance, coneAngleDeg, minSpeed };

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;

    const samples: Sample[] = [];
    const prefetched = new Set<string>();
    let frame = 0;

    function process() {
      frame = 0;
      const container = containerRef.current;
      const cursor = samples[samples.length - 1];
      if (!container || !cursor) return;

      const velocity = estimateVelocity(samples);
      const anchors = Array.from(
        container.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')
      );
      for (const anchor of anchors) {
        const href = anchor.getAttribute("href");
        if (!href || href.includes("#") || prefetched.has(href)) continue;
        if (
          isHeadingToward(
            cursor,
            velocity,
            anchor.getBoundingClientRect(),
            optsRef.current
          )
        ) {
          router.prefetch(href as Route);
          prefetched.add(href);
        }
      }
    }

    function handlePointerMove(e: PointerEvent) {
      samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      const cutoff = e.timeStamp - SAMPLE_WINDOW_MS;
      while (
        samples.length > MAX_SAMPLES ||
        (samples.length > 2 && samples[0].t < cutoff)
      ) {
        samples.shift();
      }
      if (!frame) frame = requestAnimationFrame(process);
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [containerRef, router, enabled]);
}
