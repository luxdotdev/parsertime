"use client";

import {
  buildHeatmapImageData,
  parseOklchToRgb,
  type Ramp,
} from "@/components/map/heatmap/heatmap-render";
import type { HeatmapSubMap, KillPoint } from "@/data/map/heatmap/types";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { toHero, toTimestamp } from "@/lib/utils";
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

const RAMP_TOKENS = [
  "--chart-5",
  "--chart-2",
  "--chart-4",
  "--chart-1",
  "--chart-3",
] as const;

const RAMP_ALPHAS = [0, 130, 180, 215, 240];

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
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [activeCategories, setActiveCategories] = useState<
    Set<HeatmapCategory>
  >(new Set(["damage", "healing", "kills"]));
  const { resolvedTheme } = useTheme();
  const srListId = useId();

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

  const { team1, team2 } = useColorblindMode();

  const themeTokens = useMemo(() => {
    void resolvedTheme;
    if (typeof window === "undefined") {
      return {
        ramp: RAMP_TOKENS.map((_, i) => [200, 120, 80, RAMP_ALPHAS[i]]) as Ramp,
        background: "#0a0a0a",
        team1: team1,
        team2: team2,
      };
    }
    const styles = getComputedStyle(document.documentElement);
    function resolve(token: string) {
      return styles.getPropertyValue(token).trim();
    }
    function tokenToRgb(token: string): [number, number, number] {
      const value = resolve(token);
      return parseOklchToRgb(value) ?? [200, 120, 80];
    }
    const ramp: Ramp = RAMP_TOKENS.map((token, i) => {
      const [r, g, b] = tokenToRgb(token);
      return [r, g, b, RAMP_ALPHAS[i]];
    });
    function resolveTeam(c: string) {
      return c.startsWith("var(") ? resolve(c.slice(4, -1)) : c;
    }
    return {
      ramp,
      background: resolve("--background") || "#0a0a0a",
      team1: resolveTeam(team1),
      team2: resolveTeam(team2),
    };
  }, [resolvedTheme, team1, team2]);

  const killsOnly =
    activeCategories.has("kills") &&
    !activeCategories.has("damage") &&
    !activeCategories.has("healing");

  const activePoints = useMemo(() => {
    const result: { u: number; v: number }[] = [];
    if (activeCategories.has("damage")) result.push(...damagePoints);
    if (activeCategories.has("healing")) result.push(...healingPoints);
    if (activeCategories.has("kills")) result.push(...killPoints);
    return result;
  }, [activeCategories, damagePoints, healingPoints, killPoints]);

  const heatmapData = useMemo(
    () =>
      killsOnly
        ? null
        : buildHeatmapImageData(
            activePoints,
            imageWidth,
            imageHeight,
            themeTokens.ramp
          ),
    [activePoints, imageWidth, imageHeight, killsOnly, themeTokens.ramp]
  );

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

    ctx.fillStyle = themeTokens.background;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.save();
    ctx.translate(canvasSize.width / 2, canvasSize.height / 2);
    ctx.scale(currentView.zoom, currentView.zoom);
    ctx.translate(
      -imageWidth / 2 + currentView.offsetX / currentView.zoom,
      -imageHeight / 2 + currentView.offsetY / currentView.zoom
    );
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);

    if (killsOnly) {
      const dotRadius = Math.max(12, 6 / currentView.zoom);
      for (const kp of killPoints) {
        const color = kp.team === 1 ? themeTokens.team1 : themeTokens.team2;
        ctx.beginPath();
        ctx.arc(kp.u, kp.v, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (heatmapBitmap) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(heatmapBitmap, 0, 0, imageWidth, imageHeight);
    }

    ctx.restore();
  }, [
    canvasSize,
    imageLoaded,
    imageWidth,
    imageHeight,
    heatmapBitmap,
    killsOnly,
    killPoints,
    themeTokens,
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

  const [hoveredKill, setHoveredKill] = useState<{
    kill: KillPoint;
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
      if (hoveredKill) setHoveredKill(null);
      requestRender();
      return;
    }

    if (!killsOnly) {
      if (hoveredKill) setHoveredKill(null);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { u, v } = screenToImage(sx, sy);
    const hitRadius = Math.max(12, 6 / view.zoom);

    let closest: KillPoint | null = null;
    let closestDist = Infinity;
    for (const kp of killPoints) {
      const du = kp.u - u;
      const dv = kp.v - v;
      const d = Math.sqrt(du * du + dv * dv);
      if (d <= hitRadius * 1.5 && d < closestDist) {
        closest = kp;
        closestDist = d;
      }
    }

    if (closest) {
      setHoveredKill({ kill: closest, screenX: sx, screenY: sy });
    } else if (hoveredKill) {
      setHoveredKill(null);
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
        if (newZoom <= minZoom) {
          return { offsetX: 0, offsetY: 0, zoom: newZoom };
        }
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
      setView((v) => ({
        ...v,
        zoom: Math.min(10, v.zoom * 1.1),
      }));
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
            aria-pressed={activeCategories.has(key)}
            className={`inline-flex h-5 items-center rounded-sm px-2 py-0.5 text-xs transition-colors ${
              activeCategories.has(key)
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {label}
            <span className="ml-1 font-mono tabular-nums opacity-60">
              ({count.toLocaleString()})
            </span>
          </button>
        ))}
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {activePoints.length.toLocaleString()} total
        </span>
      </div>
      <div
        ref={containerRef}
        role="application"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus required for keyboard pan/zoom
        tabIndex={0}
        aria-describedby={killsOnly ? srListId : undefined}
        onKeyDown={handleKeyDown}
        className="bg-background focus-visible:ring-ring/50 relative min-h-[500px] w-full overflow-hidden rounded-lg border outline-none focus-visible:ring-[3px]"
      >
        <canvas
          ref={canvasRef}
          aria-label="Fight heatmap overlay on map image. Drag to pan, scroll to zoom. Use plus and minus to zoom, arrow keys to pan, zero to reset."
          role="img"
          style={{ width: canvasSize.width, height: canvasSize.height }}
          className={`active:cursor-grabbing ${hoveredKill ? "cursor-pointer" : "cursor-grab"}`}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        {killsOnly && (
          <ul
            id={srListId}
            className="sr-only"
            aria-label={`${killPoints.length} kill events`}
          >
            {killPoints.map((kp) => (
              <li
                key={`${kp.matchTime}-${kp.attackerName}-${kp.attackerHero}-${kp.victimName}-${kp.victimHero}`}
              >
                {`${kp.attackerName} (${kp.attackerHero}) eliminated ${kp.victimName} (${kp.victimHero}) at ${toTimestamp(kp.matchTime)}`}
              </li>
            ))}
          </ul>
        )}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">Loading map image...</p>
          </div>
        )}
        {hoveredKill && (
          <KillTooltip
            kill={hoveredKill.kill}
            x={hoveredKill.screenX}
            y={hoveredKill.screenY}
            team1Color={team1}
            team2Color={team2}
          />
        )}
        <div className="bg-popover/95 text-muted-foreground absolute right-2 bottom-2 rounded-md border px-2.5 py-1.5 text-xs">
          {Math.round(view.zoom * 100)}% · Scroll to zoom · Drag to pan
        </div>
      </div>
    </div>
  );
}

function KillTooltip({
  kill,
  x,
  y,
  team1Color,
  team2Color,
}: {
  kill: KillPoint;
  x: number;
  y: number;
  team1Color: string;
  team2Color: string;
}) {
  const color = kill.team === 1 ? team1Color : team2Color;

  return (
    <div
      className="bg-popover text-popover-foreground pointer-events-none absolute z-10 rounded-lg border p-2.5 text-xs shadow-lg"
      style={{
        left: x + 16,
        top: y - 20,
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Image
            src={`/heroes/${toHero(kill.attackerHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-5 w-5 rounded-full border-2"
            style={{ borderColor: kill.team === 1 ? team2Color : team1Color }}
          />
          <span className="font-medium">{kill.attackerName}</span>
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="flex items-center gap-1.5">
          <Image
            src={`/heroes/${toHero(kill.victimHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-5 w-5 rounded-full border-2 grayscale"
            style={{ borderColor: color }}
          />
          <span className="font-medium">{kill.victimName}</span>
        </div>
      </div>
      <div className="text-muted-foreground mt-1 flex items-center gap-2">
        <span>{toTimestamp(kill.matchTime)}</span>
        <span>·</span>
        <span>{kill.ability === "0" ? "Primary Fire" : kill.ability}</span>
      </div>
    </div>
  );
}
