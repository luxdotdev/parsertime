"use client";

import type { HeatmapSubMap } from "@/data/heatmap-dto";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type HeatmapCategory = "damage" | "healing" | "kills";

type HeatmapCanvasProps = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  damagePoints: HeatmapSubMap["damagePoints"];
  healingPoints: HeatmapSubMap["healingPoints"];
  killPoints: HeatmapSubMap["killPoints"];
  labels: {
    damage: string;
    healing: string;
    kills: string;
  };
};

const DOWNSCALE = 4;
const SIGMA = 20;

const COLOR_RAMP: [number, number, number, number][] = [
  [100, 150, 255, 0],
  [100, 150, 255, 90],
  [60, 60, 220, 130],
  [120, 40, 200, 160],
  [180, 30, 160, 185],
  [220, 20, 100, 205],
  [240, 10, 60, 225],
  [200, 0, 120, 240],
];

function interpolateColor(t: number): [number, number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (COLOR_RAMP.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, COLOR_RAMP.length - 1);
  const frac = idx - lo;

  return [
    Math.round(
      COLOR_RAMP[lo][0] + (COLOR_RAMP[hi][0] - COLOR_RAMP[lo][0]) * frac
    ),
    Math.round(
      COLOR_RAMP[lo][1] + (COLOR_RAMP[hi][1] - COLOR_RAMP[lo][1]) * frac
    ),
    Math.round(
      COLOR_RAMP[lo][2] + (COLOR_RAMP[hi][2] - COLOR_RAMP[lo][2]) * frac
    ),
    Math.round(
      COLOR_RAMP[lo][3] + (COLOR_RAMP[hi][3] - COLOR_RAMP[lo][3]) * frac
    ),
  ];
}

function buildHeatmapImageData(
  points: { u: number; v: number }[],
  imageWidth: number,
  imageHeight: number
): ImageData | null {
  if (points.length === 0) return null;

  const gw = Math.ceil(imageWidth / DOWNSCALE);
  const gh = Math.ceil(imageHeight / DOWNSCALE);
  const sigma = SIGMA / DOWNSCALE;
  const sigma2 = 2 * sigma * sigma;
  const radius = Math.ceil(sigma * 3);

  const density = new Float32Array(gw * gh);

  for (const pt of points) {
    const gx = pt.u / DOWNSCALE;
    const gy = pt.v / DOWNSCALE;
    const x0 = Math.max(0, Math.floor(gx - radius));
    const x1 = Math.min(gw - 1, Math.ceil(gx + radius));
    const y0 = Math.max(0, Math.floor(gy - radius));
    const y1 = Math.min(gh - 1, Math.ceil(gy + radius));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - gx;
        const dy = y - gy;
        density[y * gw + x] += Math.exp(-(dx * dx + dy * dy) / sigma2);
      }
    }
  }

  let maxDensity = 0;
  for (let i = 0; i < density.length; i++) {
    if (density[i] > maxDensity) maxDensity = density[i];
  }
  if (maxDensity === 0) return null;

  const imgData = new ImageData(gw, gh);
  const data = imgData.data;
  const threshold = 0.05;

  for (let i = 0; i < density.length; i++) {
    const t = density[i] / maxDensity;
    if (t < threshold) continue;
    const [r, g, b, a] = interpolateColor(t);
    const off = i * 4;
    data[off] = r;
    data[off + 1] = g;
    data[off + 2] = b;
    data[off + 3] = a;
  }

  return imgData;
}

export function HeatmapCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  damagePoints,
  healingPoints,
  killPoints,
  labels,
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [view, setView] = useState({ offsetX: 0, offsetY: 0, zoom: 1 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [activeCategories, setActiveCategories] = useState<
    Set<HeatmapCategory>
  >(new Set(["damage", "healing", "kills"]));

  function toggleCategory(cat: HeatmapCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);

      if (containerRef.current) {
        const container = containerRef.current;
        const fitZoom = Math.min(
          container.clientWidth / imageWidth,
          container.clientHeight / imageHeight
        );
        setView({ offsetX: 0, offsetY: 0, zoom: fitZoom });
      }
    };
    img.src = imageUrl;
  }, [imageUrl, imageWidth, imageHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const activePoints = useMemo(() => {
    const result: { u: number; v: number }[] = [];
    if (activeCategories.has("damage")) result.push(...damagePoints);
    if (activeCategories.has("healing")) result.push(...healingPoints);
    if (activeCategories.has("kills")) result.push(...killPoints);
    return result;
  }, [activeCategories, damagePoints, healingPoints, killPoints]);

  const heatmapData = useMemo(
    () => buildHeatmapImageData(activePoints, imageWidth, imageHeight),
    [activePoints, imageWidth, imageHeight]
  );

  const [heatmapBitmap, setHeatmapBitmap] = useState<ImageBitmap | null>(null);
  useEffect(() => {
    setHeatmapBitmap(null);
    if (!heatmapData) return;

    let cancelled = false;
    createImageBitmap(heatmapData).then((bmp) => {
      if (!cancelled) setHeatmapBitmap(bmp);
    });
    return () => {
      cancelled = true;
    };
  }, [heatmapData]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;
    if (!canvas || !ctx || !img || !imageLoaded) return;

    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    const bgColor =
      getComputedStyle(canvas).getPropertyValue("--color-background");
    ctx.fillStyle = bgColor.trim() || "#0a0a0a";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.save();
    ctx.translate(canvasSize.width / 2, canvasSize.height / 2);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(
      -imageWidth / 2 + view.offsetX / view.zoom,
      -imageHeight / 2 + view.offsetY / view.zoom
    );
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);

    if (heatmapBitmap) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(heatmapBitmap, 0, 0, imageWidth, imageHeight);
    }

    ctx.restore();
  }, [canvasSize, view, imageLoaded, imageWidth, imageHeight, heatmapBitmap]);

  useEffect(() => {
    requestAnimationFrame(render);
  }, [render]);

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button === 0) {
      draggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setView((v) => ({
      ...v,
      offsetX: v.offsetX + dx,
      offsetY: v.offsetY + dy,
    }));
  }

  function handlePointerUp() {
    draggingRef.current = false;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function handler(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setView((v) => ({
        ...v,
        zoom: Math.max(0.01, Math.min(10, v.zoom * factor)),
      }));
    }
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, []);

  const categories: { key: HeatmapCategory; label: string; count: number }[] = [
    { key: "damage", label: labels.damage, count: damagePoints.length },
    { key: "healing", label: labels.healing, count: healingPoints.length },
    { key: "kills", label: labels.kills, count: killPoints.length },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {categories.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleCategory(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategories.has(key)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
            <span className="ml-1.5 opacity-60">
              ({count.toLocaleString()})
            </span>
          </button>
        ))}
        <span className="text-muted-foreground text-xs">
          {activePoints.length.toLocaleString()} total
        </span>
      </div>
      <div
        ref={containerRef}
        className="bg-background relative min-h-[500px] w-full overflow-hidden rounded-lg border"
      >
        <canvas
          ref={canvasRef}
          aria-label="Fight heatmap overlay on map image. Drag to pan, scroll to zoom."
          role="img"
          style={{ width: canvasSize.width, height: canvasSize.height }}
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">Loading map image...</p>
          </div>
        )}
        <div className="absolute right-2 bottom-2 rounded-md bg-black/60 px-2.5 py-1.5 text-xs text-white/60 backdrop-blur-sm">
          {Math.round(view.zoom * 100)}% · Scroll to zoom · Drag to pan
        </div>
      </div>
    </div>
  );
}
