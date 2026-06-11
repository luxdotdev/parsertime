"use client";

import type { NamedCallout } from "@/data/team/fight-field-service";
import { FIELD_CELL_SIZE_M, type FieldCell } from "@/lib/fight-field";
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import { useEffect, useMemo, useRef, useState } from "react";

type FightMapCanvasProps = {
  cells: FieldCell[];
  callouts: NamedCallout[];
  calibration: LoadedCalibration;
};

const WIN_RGB = "34, 197, 94";
const LOSS_RGB = "239, 68, 68";

/**
 * The fight-winrate field painted over a cropped slice of the calibrated
 * map image. Color diverges around 50% winrate; opacity follows fight
 * support so the field fades out where little happened.
 */
export function FightMapCanvas({
  cells,
  callouts,
  calibration,
}: FightMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { transform, imagePresignedUrl, imageWidth, imageHeight } = calibration;

  // Crop region: the field's image-space bounding box, padded and clamped.
  const crop = useMemo(() => {
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    let inside = 0;
    for (const cell of cells) {
      const { u, v } = worldToImage({ x: cell.x, y: cell.z }, transform);
      if (u < 0 || v < 0 || u > imageWidth || v > imageHeight) continue;
      inside++;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    if (inside === 0 || inside / cells.length < 0.5) return null; // broken calibration guard
    const pad = Math.max((maxU - minU) * 0.18, (maxV - minV) * 0.18, 120);
    const x = Math.max(0, minU - pad);
    const y = Math.max(0, minV - pad);
    const w = Math.min(imageWidth, maxU + pad) - x;
    const h = Math.min(imageHeight, maxV + pad) - y;
    return { x, y, w, h };
  }, [cells, transform, imageWidth, imageHeight]);

  // Paint lazily: a page of these would otherwise decode several
  // 8192px map images at once and stall the renderer.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!crop || !visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new globalThis.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const scale = canvas.width / crop.w;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // The presigned file may be a downscaled display image; crop
      // coordinates are in calibration space, so scale the source rect
      // into the bitmap's natural pixels.
      const sx = image.naturalWidth / imageWidth;
      const sy = image.naturalHeight / imageHeight;
      ctx.drawImage(
        image,
        crop.x * sx,
        crop.y * sy,
        crop.w * sx,
        crop.h * sy,
        0,
        0,
        canvas.width,
        canvas.height
      );
      // Dim with a cheap overlay instead of ctx.filter (which is very
      // slow on large draws and stalls the page with many maps).
      ctx.fillStyle = "rgba(9, 9, 11, 0.42)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const pxPerMeter = Math.hypot(transform.a, transform.c);
      const radius = FIELD_CELL_SIZE_M * pxPerMeter * scale * 1.7;

      for (const cell of cells) {
        const { u, v } = worldToImage({ x: cell.x, y: cell.z }, transform);
        const cx = (u - crop.x) * scale;
        const cy = (v - crop.y) * scale;
        if (cx < -radius || cy < -radius) continue;
        if (cx > canvas.width + radius || cy > canvas.height + radius) continue;

        // Diverging intensity: distance from 50% drives color strength.
        const lean = (cell.winrate - 50) / 50; // -1 .. 1
        const rgb = lean >= 0 ? WIN_RGB : LOSS_RGB;
        const strength = Math.min(1, Math.abs(lean) * 1.6 + 0.15);
        const alpha = Math.min(0.55, 0.16 + cell.support * 0.1) * strength;

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(${rgb}, ${alpha.toFixed(3)})`);
        gradient.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    image.src = imagePresignedUrl;
  }, [
    cells,
    crop,
    transform,
    imagePresignedUrl,
    visible,
    imageWidth,
    imageHeight,
  ]);

  if (!crop) return null;

  // Cap the backing store in BOTH dimensions — sizing by width alone
  // lets a tall narrow crop allocate a multi-thousand-pixel canvas.
  const aspect = crop.w / crop.h;
  const maxEdge = 1400;
  const canvasWidth = aspect >= 1 ? maxEdge : Math.round(maxEdge * aspect);
  const canvasHeight = aspect >= 1 ? Math.round(maxEdge / aspect) : maxEdge;

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="border-border w-full rounded-lg border"
        style={{ maxHeight: 560, objectFit: "contain" }}
        aria-hidden
      />
      {callouts.map((callout) => {
        const { u, v } = worldToImage(
          { x: callout.x, y: callout.z },
          transform
        );
        const left = ((u - crop.x) / crop.w) * 100;
        const top = ((v - crop.y) / crop.h) * 100;
        if (left < 0 || left > 100 || top < 0 || top > 100) return null;
        const strong = callout.polarity === "strong";
        return (
          <div
            key={`co-${callout.polarity}-${callout.x.toFixed(1)}-${callout.z.toFixed(1)}`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums shadow-sm ${
              strong
                ? "border-green-500/60 bg-green-950/90 text-green-300"
                : "border-red-500/60 bg-red-950/90 text-red-300"
            }`}
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            {callout.won}–{callout.lost}
          </div>
        );
      })}
    </div>
  );
}
