"use client";

import {
  buildHeatmapImageData,
  HEATMAP_RAMP,
  resolveColorToRgb,
} from "@/components/map/heatmap/heatmap-render";
import type {
  PlayerHeatLayerKey,
  PlayerHeatmapSubMap,
  PlayerMarkerLayerKey,
  PlayerMarkerPoint,
} from "@/data/map/player-telemetry-types";
import { toHero, toTimestamp } from "@/lib/utils";
import { heroAbilityMapping, type HeroName } from "@/types/heroes";
import { useTheme } from "next-themes";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

const MARKER_RADIUS = 4.5;

/** Marker hues, distinct from each other, from the warm density ramp, and
 * reinforced by shape (circle / cross / triangle). */
const MARKER_COLORS: Record<PlayerMarkerLayerKey, string> = {
  kills: "oklch(0.8 0.18 150)", // green: frags won
  deaths: "oklch(0.66 0.26 25)", // red: deaths
  abilities: "oklch(0.72 0.13 250)", // blue: ability usage
};

export type PlayerHeatmapLabels = {
  heatGroup: string;
  heat: Record<PlayerHeatLayerKey, string>;
  marker: Record<PlayerMarkerLayerKey, string>;
  abilityKinds: { ability_1: string; ability_2: string; ultimate: string };
  abilityFilterLabel: string;
  loading: string;
};

type Props = {
  subMap: PlayerHeatmapSubMap;
  labels: PlayerHeatmapLabels;
};

type AbilityOption = { key: string; hero: string; kind: string };

export function PlayerHeatmapCanvas({ subMap, labels }: Props) {
  const { imagePresignedUrl: imageUrl, imageWidth, imageHeight } = subMap;
  const { resolvedTheme } = useTheme();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [view, setView] = useState({ offsetX: 0, offsetY: 0, zoom: 1 });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const srListId = useId();

  const heatKeys = useMemo(
    () => subMap.heatLayers.map((l) => l.key),
    [subMap.heatLayers]
  );
  const markerKeys = useMemo(
    () => subMap.markerLayers.map((l) => l.key),
    [subMap.markerLayers]
  );

  const [activeHeat, setActiveHeat] = useState<PlayerHeatLayerKey | null>(
    heatKeys[0] ?? null
  );
  // Kills and deaths on by default; abilities are an opt-in drill-down since a
  // single map can hold hundreds and would otherwise bury the density.
  const [activeMarkers, setActiveMarkers] = useState<Set<PlayerMarkerLayerKey>>(
    () => new Set(markerKeys.filter((k) => k !== "abilities"))
  );

  // Distinct (hero, ability kind) pairs, so the abilities layer can be filtered
  // down to a single hero's single ability (e.g. only Symmetra's teleporter).
  const abilityOptions: AbilityOption[] = useMemo(() => {
    const layer = subMap.markerLayers.find((l) => l.key === "abilities");
    if (!layer) return [];
    const seen = new Map<string, AbilityOption>();
    for (const p of layer.points) {
      const key = `${p.hero}|${p.label}`;
      if (!seen.has(key)) seen.set(key, { key, hero: p.hero, kind: p.label });
    }
    return [...seen.values()].sort(
      (a, b) => a.hero.localeCompare(b.hero) || a.kind.localeCompare(b.kind)
    );
  }, [subMap.markerLayers]);

  const [abilityFilter, setAbilityFilter] = useState<Set<string>>(
    () => new Set(abilityOptions.map((o) => o.key))
  );

  function toggleMarker(key: PlayerMarkerLayerKey) {
    setActiveMarkers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAbility(key: string) {
    setAbilityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    const img = new globalThis.Image();
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

  const background = useMemo(() => {
    void resolvedTheme;
    if (typeof window === "undefined") return "#0a0a0a";
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim() || "#0a0a0a"
    );
  }, [resolvedTheme]);

  const activeHeatLayer = useMemo(
    () => subMap.heatLayers.find((l) => l.key === activeHeat) ?? null,
    [subMap.heatLayers, activeHeat]
  );

  const heatmapData = useMemo(() => {
    if (!activeHeatLayer || typeof window === "undefined") return null;
    return buildHeatmapImageData(
      activeHeatLayer.points,
      imageWidth,
      imageHeight,
      HEATMAP_RAMP,
      0.03
    );
  }, [activeHeatLayer, imageWidth, imageHeight]);

  const [heatmapBitmap, setHeatmapBitmap] = useState<ImageBitmap | null>(null);
  useEffect(() => {
    setHeatmapBitmap(null);
    if (!heatmapData) return;
    let cancelled = false;
    void createImageBitmap(heatmapData).then((bmp) => {
      if (!cancelled) setHeatmapBitmap(bmp);
    });
    return () => {
      cancelled = true;
    };
  }, [heatmapData]);

  const activeMarkerPoints = useMemo(() => {
    const out: {
      point: PlayerMarkerPoint;
      color: string;
      key: PlayerMarkerLayerKey;
    }[] = [];
    for (const layer of subMap.markerLayers) {
      if (!activeMarkers.has(layer.key)) continue;
      const [r, g, b] = resolveColorToRgb(MARKER_COLORS[layer.key]);
      const color = `rgb(${r}, ${g}, ${b})`;
      for (const point of layer.points) {
        if (
          layer.key === "abilities" &&
          !abilityFilter.has(`${point.hero}|${point.label}`)
        ) {
          continue;
        }
        out.push({ point, color, key: layer.key });
      }
    }
    return out;
  }, [subMap.markerLayers, activeMarkers, abilityFilter]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;
    if (!canvas || !ctx || !img || !imageLoaded) return;

    const currentView = viewRef.current;
    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.save();
    ctx.translate(canvasSize.width / 2, canvasSize.height / 2);
    ctx.scale(currentView.zoom, currentView.zoom);
    ctx.translate(
      -imageWidth / 2 + currentView.offsetX / currentView.zoom,
      -imageHeight / 2 + currentView.offsetY / currentView.zoom
    );
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);

    if (heatmapBitmap) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(heatmapBitmap, 0, 0, imageWidth, imageHeight);
    }

    const r = Math.max(MARKER_RADIUS, MARKER_RADIUS / currentView.zoom);
    const halo = "rgba(0,0,0,0.65)";
    for (const { point, color, key } of activeMarkerPoints) {
      const { u, v } = point;
      if (key === "deaths") {
        // X cross with a dark halo behind for contrast.
        ctx.lineCap = "round";
        for (const [stroke, w] of [
          [halo, 3.4],
          [color, 2],
        ] as const) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = w / currentView.zoom;
          ctx.beginPath();
          ctx.moveTo(u - r, v - r);
          ctx.lineTo(u + r, v + r);
          ctx.moveTo(u + r, v - r);
          ctx.lineTo(u - r, v + r);
          ctx.stroke();
        }
      } else if (key === "abilities") {
        // Upward triangle.
        const s = r * 1.15;
        ctx.beginPath();
        ctx.moveTo(u, v - s);
        ctx.lineTo(u + s, v + s * 0.85);
        ctx.lineTo(u - s, v + s * 0.85);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.2 / currentView.zoom;
        ctx.strokeStyle = halo;
        ctx.stroke();
      } else {
        // kills: filled circle.
        ctx.beginPath();
        ctx.arc(u, v, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.4 / currentView.zoom;
        ctx.strokeStyle = halo;
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [
    canvasSize,
    imageLoaded,
    imageWidth,
    imageHeight,
    heatmapBitmap,
    activeMarkerPoints,
    background,
  ]);

  useEffect(() => {
    const raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [render, view]);

  const requestRender = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      render();
    });
  }, [render]);

  const [hoveredMarker, setHoveredMarker] = useState<{
    point: PlayerMarkerPoint;
    key: PlayerMarkerLayerKey;
    screenX: number;
    screenY: number;
  } | null>(null);

  function screenToImage(screenX: number, screenY: number) {
    return {
      u:
        (screenX - canvasSize.width / 2) / view.zoom +
        imageWidth / 2 -
        view.offsetX / view.zoom,
      v:
        (screenY - canvasSize.height / 2) / view.zoom +
        imageHeight / 2 -
        view.offsetY / view.zoom,
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button === 0) {
      draggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (draggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      const v = viewRef.current;
      viewRef.current = {
        ...v,
        offsetX: v.offsetX + dx,
        offsetY: v.offsetY + dy,
      };
      if (hoveredMarker) setHoveredMarker(null);
      requestRender();
      return;
    }

    if (activeMarkerPoints.length === 0) {
      if (hoveredMarker) setHoveredMarker(null);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { u, v } = screenToImage(sx, sy);
    const hitRadius = Math.max(12, 8 / view.zoom);

    let closest: (typeof activeMarkerPoints)[number] | null = null;
    let closestDist = Infinity;
    for (const m of activeMarkerPoints) {
      const du = m.point.u - u;
      const dv = m.point.v - v;
      const d = Math.sqrt(du * du + dv * dv);
      if (d <= hitRadius * 1.5 && d < closestDist) {
        closest = m;
        closestDist = d;
      }
    }

    if (closest) {
      setHoveredMarker({
        point: closest.point,
        key: closest.key,
        screenX: sx,
        screenY: sy,
      });
    } else if (hoveredMarker) {
      setHoveredMarker(null);
    }
  }

  function handlePointerUp() {
    if (draggingRef.current) {
      draggingRef.current = false;
      setView(viewRef.current);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function handler(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const minZoom = canvasSize.height / imageHeight;
      setView((v) => {
        const newZoom = Math.max(minZoom, Math.min(10, v.zoom * factor));
        if (newZoom <= minZoom)
          return { offsetX: 0, offsetY: 0, zoom: newZoom };
        return { ...v, zoom: newZoom };
      });
    }
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, [canvasSize.height, imageHeight]);

  function handleKeyDown(e: React.KeyboardEvent) {
    const minZoom = canvasSize.height / imageHeight;
    const panStep = e.shiftKey ? 0.025 : 0.1;
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setView((v) => ({ ...v, zoom: Math.min(10, v.zoom * 1.1) }));
      return;
    }
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setView((v) => {
        const newZoom = Math.max(minZoom, v.zoom * 0.9);
        if (newZoom <= minZoom)
          return { offsetX: 0, offsetY: 0, zoom: newZoom };
        return { ...v, zoom: newZoom };
      });
      return;
    }
    if (e.key === "0") {
      e.preventDefault();
      setView({ offsetX: 0, offsetY: 0, zoom: minZoom });
      return;
    }
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const dx =
        e.key === "ArrowLeft"
          ? canvasSize.width * panStep
          : e.key === "ArrowRight"
            ? -canvasSize.width * panStep
            : 0;
      const dy =
        e.key === "ArrowUp"
          ? canvasSize.height * panStep
          : e.key === "ArrowDown"
            ? -canvasSize.height * panStep
            : 0;
      setView((v) => ({
        ...v,
        offsetX: v.offsetX + dx,
        offsetY: v.offsetY + dy,
      }));
    }
  }

  const showAbilityFilter =
    activeMarkers.has("abilities") && abilityOptions.length > 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {subMap.heatLayers.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase">
              {labels.heatGroup}
            </span>
            {subMap.heatLayers.map((layer) => (
              <button
                key={layer.key}
                type="button"
                onClick={() => setActiveHeat(layer.key)}
                aria-pressed={activeHeat === layer.key}
                className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors ${
                  activeHeat === layer.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {labels.heat[layer.key]}
                <span className="font-mono tabular-nums opacity-60">
                  {layer.points.length.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}

        {subMap.markerLayers.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {subMap.markerLayers.map((layer) => {
              const on = activeMarkers.has(layer.key);
              return (
                <button
                  key={layer.key}
                  type="button"
                  onClick={() => toggleMarker(layer.key)}
                  aria-pressed={on}
                  className={`inline-flex h-6 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
                    on
                      ? "border-border bg-muted text-foreground"
                      : "border-border/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <MarkerGlyph
                    markerKey={layer.key}
                    color={MARKER_COLORS[layer.key]}
                    dim={!on}
                  />
                  {labels.marker[layer.key]}
                  <span className="font-mono tabular-nums opacity-60">
                    {layer.points.length.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showAbilityFilter && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase">
            {labels.abilityFilterLabel}
          </span>
          {abilityOptions.map((opt) => {
            const on = abilityFilter.has(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleAbility(opt.key)}
                aria-pressed={on}
                className={`inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors ${
                  on
                    ? "border-border bg-muted text-foreground"
                    : "border-border/60 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Image
                  src={`/heroes/${toHero(opt.hero)}.png`}
                  alt=""
                  width={40}
                  height={40}
                  className={`size-4 rounded-sm ${on ? "" : "grayscale"}`}
                />
                {abilityKindLabel(opt.hero, opt.kind, labels)}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={containerRef}
        role="application"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus required for keyboard pan/zoom
        tabIndex={0}
        aria-describedby={srListId}
        onKeyDown={handleKeyDown}
        className="bg-background focus-visible:ring-ring/50 relative min-h-[480px] w-full overflow-hidden rounded-lg border outline-none focus-visible:ring-[3px]"
      >
        <canvas
          ref={canvasRef}
          aria-label="Player positional heatmap over the map image. Drag to pan, scroll to zoom. Use plus and minus to zoom, arrow keys to pan, zero to reset."
          role="img"
          style={{ width: canvasSize.width, height: canvasSize.height }}
          className={`active:cursor-grabbing ${hoveredMarker ? "cursor-pointer" : "cursor-grab"}`}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        <ul id={srListId} className="sr-only">
          {activeMarkerPoints.map(({ point, key }) => (
            <li
              key={`${key}-${point.time}-${point.label}-${point.u}-${point.v}`}
            >
              {markerSrText(point, key, labels)}
            </li>
          ))}
        </ul>

        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">{labels.loading}</p>
          </div>
        )}

        {hoveredMarker && (
          <MarkerTooltip
            point={hoveredMarker.point}
            markerKey={hoveredMarker.key}
            x={hoveredMarker.screenX}
            y={hoveredMarker.screenY}
            labels={labels}
          />
        )}

        <div className="bg-popover/95 text-muted-foreground absolute right-2 bottom-2 rounded-md border px-2.5 py-1.5 text-xs">
          {Math.round(view.zoom * 100)}%
        </div>
      </div>
    </div>
  );
}

function MarkerGlyph({
  markerKey,
  color,
  dim,
}: {
  markerKey: PlayerMarkerLayerKey;
  color: string;
  dim: boolean;
}) {
  const style = { color, opacity: dim ? 0.4 : 1 };
  if (markerKey === "deaths") {
    return (
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        style={style}
        aria-hidden="true"
      >
        <path
          d="M2 2 L8 8 M8 2 L2 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (markerKey === "abilities") {
    return (
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        style={style}
        aria-hidden="true"
      >
        <path d="M5 1 L9 9 L1 9 Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <span
      className="inline-block size-2.5 rounded-full"
      style={{ backgroundColor: color, opacity: dim ? 0.4 : 1 }}
      aria-hidden="true"
    />
  );
}

function abilityKindLabel(
  hero: string,
  kind: string,
  labels: PlayerHeatmapLabels
) {
  const names = heroAbilityMapping[hero as HeroName];
  if (kind === "ability_1") {
    return names?.ability1Name ?? labels.abilityKinds.ability_1;
  }
  if (kind === "ability_2") {
    return names?.ability2Name ?? labels.abilityKinds.ability_2;
  }
  if (kind === "ultimate") return labels.abilityKinds.ultimate;
  return kind;
}

function markerSrText(
  point: PlayerMarkerPoint,
  key: PlayerMarkerLayerKey,
  labels: PlayerHeatmapLabels
) {
  const time = toTimestamp(point.time);
  if (key === "abilities") {
    return `${abilityKindLabel(point.hero, point.label, labels)} (${point.hero}) at ${time}`;
  }
  return `${labels.marker[key]}: ${point.label} at ${time}`;
}

function MarkerTooltip({
  point,
  markerKey,
  x,
  y,
  labels,
}: {
  point: PlayerMarkerPoint;
  markerKey: PlayerMarkerLayerKey;
  x: number;
  y: number;
  labels: PlayerHeatmapLabels;
}) {
  const isAbility = markerKey === "abilities";
  const primary = isAbility
    ? abilityKindLabel(point.hero, point.label, labels)
    : point.label;
  const ability =
    !isAbility && point.ability
      ? point.ability === "0"
        ? "Primary Fire"
        : point.ability
      : null;

  return (
    <div
      className="bg-popover text-popover-foreground pointer-events-none absolute z-10 rounded-lg border p-2.5 text-xs shadow-lg"
      style={{ left: x + 16, top: y - 20 }}
    >
      <div className="flex items-center gap-1.5">
        <Image
          src={`/heroes/${toHero(point.hero)}.png`}
          alt=""
          width={64}
          height={64}
          className="size-5 rounded-sm"
        />
        <span className="font-medium">{primary}</span>
      </div>
      <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
        <span className="font-mono tabular-nums">
          {toTimestamp(point.time)}
        </span>
        {ability && (
          <>
            <span>&middot;</span>
            <span>{ability}</span>
          </>
        )}
      </p>
    </div>
  );
}
