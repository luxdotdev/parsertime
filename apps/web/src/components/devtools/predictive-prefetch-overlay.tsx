"use client";

import type { PredictivePrefetchDebugFrame } from "@/hooks/use-predictive-prefetch";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Detection-state palette (matches the product's amber accent).
const AMBER = "#f59e0b";
const GREEN = "#22c55e";
const MUTED = "rgba(148, 163, 184, 0.55)";

// Fixed length of the heading-direction arrow, in px.
const ARROW_LENGTH = 64;

/**
 * Full-viewport visualization of the predictive-prefetch detector. Renders the
 * cursor reach, heading cone, and each nav link colored by state (idle / heading
 * toward / prefetched). Portaled to `document.body` so it sits above the app's
 * stacking contexts; pointer-events are disabled so it never blocks the UI.
 *
 * Gate rendering behind `prefetchDebugEnabled()` at the call site.
 */
export function PredictivePrefetchOverlay({
  frame,
}: {
  frame: PredictivePrefetchDebugFrame | null;
}) {
  // Portal target only exists after mount; avoids SSR hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !frame) return null;

  const {
    cursor,
    velocity,
    speed,
    maxDistance,
    coneAngleDeg,
    minSpeed,
    links,
  } = frame;
  const moving = speed >= minSpeed;
  const heading = Math.atan2(velocity.y, velocity.x);
  const half = (coneAngleDeg * Math.PI) / 180;

  // Cone wedge: two rays at heading ± half-angle, closed by an arc at the reach.
  const a1 = heading - half;
  const a2 = heading + half;
  const p1x = cursor.x + maxDistance * Math.cos(a1);
  const p1y = cursor.y + maxDistance * Math.sin(a1);
  const p2x = cursor.x + maxDistance * Math.cos(a2);
  const p2y = cursor.y + maxDistance * Math.sin(a2);
  const conePath = `M ${cursor.x} ${cursor.y} L ${p1x} ${p1y} A ${maxDistance} ${maxDistance} 0 0 1 ${p2x} ${p2y} Z`;

  const tipX = cursor.x + ARROW_LENGTH * Math.cos(heading);
  const tipY = cursor.y + ARROW_LENGTH * Math.sin(heading);

  return createPortal(
    <svg
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      aria-hidden="true"
    >
      {/* Reach: links beyond this are never considered. */}
      <circle
        cx={cursor.x}
        cy={cursor.y}
        r={maxDistance}
        fill="none"
        stroke={MUTED}
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* Heading cone + direction arrow (only while the cursor is moving). */}
      {moving && (
        <>
          <path
            d={conePath}
            fill={AMBER}
            fillOpacity={0.12}
            stroke={AMBER}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
          <line
            x1={cursor.x}
            y1={cursor.y}
            x2={tipX}
            y2={tipY}
            stroke={AMBER}
            strokeWidth={2}
          />
        </>
      )}

      {/* Each nav link, colored by detection state. */}
      {links.map((link) => {
        const color = link.prefetched ? GREEN : link.heading ? AMBER : MUTED;
        return (
          <rect
            key={link.href}
            x={link.rect.left}
            y={link.rect.top}
            width={link.rect.width}
            height={link.rect.height}
            rx={2}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
        );
      })}

      {/* Cursor + speed readout. */}
      <circle cx={cursor.x} cy={cursor.y} r={4} fill={moving ? AMBER : MUTED} />
      <text
        x={cursor.x + 10}
        y={cursor.y - 10}
        fill={AMBER}
        fontSize={11}
        fontFamily="monospace"
      >
        {speed.toFixed(2)} px/ms
      </text>
    </svg>,
    document.body
  );
}
