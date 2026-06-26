"use client";

import {
  estimateVelocity,
  isHeadingToward,
  type Rect,
  type Sample,
  type Vec,
} from "@/lib/predictive-prefetch";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

/** Per-link detection state for one frame, consumed by the debug overlay. */
export type PredictivePrefetchDebugLink = {
  href: string;
  rect: Rect;
  heading: boolean;
  prefetched: boolean;
};

/** A snapshot of the detector's state on a single animation frame. */
export type PredictivePrefetchDebugFrame = {
  cursor: Vec;
  velocity: Vec;
  speed: number;
  maxDistance: number;
  coneAngleDeg: number;
  minSpeed: number;
  links: PredictivePrefetchDebugLink[];
};

export type PredictivePrefetchOptions = {
  maxDistance?: number;
  coneAngleDeg?: number;
  minSpeed?: number;
  enabled?: boolean;
  /**
   * When provided, called each animation frame with the full detection state.
   * Used only by the debug overlay; absent in normal use (zero overhead).
   */
  onFrame?: (frame: PredictivePrefetchDebugFrame) => void;
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
    onFrame,
  } = options;

  // Latest option values, read without re-subscribing the listener.
  const optsRef = useRef({ maxDistance, coneAngleDeg, minSpeed });
  optsRef.current = { maxDistance, coneAngleDeg, minSpeed };

  // Latest debug callback, read without re-subscribing the listener.
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

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
        container.querySelectorAll<HTMLAnchorElement>(
          'a[href^="/"]:not([href^="//"])'
        )
      );

      const reportFrame = onFrameRef.current;
      const debugLinks: PredictivePrefetchDebugLink[] | null = reportFrame
        ? []
        : null;

      for (const anchor of anchors) {
        const href = anchor.getAttribute("href");
        // Same-origin paths only: reject protocol-relative ("//host") and the
        // back-slash variant browsers normalize to it, plus in-page hashes.
        if (
          !href ||
          !href.startsWith("/") ||
          href.startsWith("//") ||
          href.startsWith("/\\") ||
          href.includes("#")
        )
          continue;

        const already = prefetched.has(href);
        // Production fast-path: once warmed, skip. In debug we keep evaluating
        // so the overlay can still show the link's idle/heading/prefetched state.
        if (already && !debugLinks) continue;

        const rect = anchor.getBoundingClientRect();
        const heading = isHeadingToward(
          cursor,
          velocity,
          rect,
          optsRef.current
        );
        if (heading && !already) {
          router.prefetch(href as Route);
          prefetched.add(href);
        }

        if (debugLinks) {
          debugLinks.push({
            href,
            rect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            },
            heading,
            prefetched: prefetched.has(href),
          });
        }
      }

      if (reportFrame && debugLinks) {
        reportFrame({
          cursor: { x: cursor.x, y: cursor.y },
          velocity,
          speed: Math.hypot(velocity.x, velocity.y),
          maxDistance: optsRef.current.maxDistance,
          coneAngleDeg: optsRef.current.coneAngleDeg,
          minSpeed: optsRef.current.minSpeed,
          links: debugLinks,
        });
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
