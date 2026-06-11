"use client";

import {
  buildHeatmapImageData,
  HEATMAP_RAMP,
} from "@/components/map/heatmap/heatmap-render";
import type { HeatmapSubMap, KillPoint } from "@/data/map/heatmap/types";
import { useMapViewport } from "@/components/map/use-map-viewport";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { toHero, toTimestamp } from "@/lib/utils";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
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

export function HeatmapCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  damagePoints,
  healingPoints,
  killPoints,
  labels,
}: HeatmapCanvasProps) {
  const t = useTranslations("mapPage.heatmap.canvas");
  const format = useFormatter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { containerRef, containerSize, view, isDragging, handlers } =
    useMapViewport({
      imageWidth,
      imageHeight,
      imageLoaded,
    });
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
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const { team1, team2 } = useColorblindMode();

  const themeTokens = useMemo(() => {
    void resolvedTheme;
    if (typeof window === "undefined") {
      return {
        background: "#0a0a0a",
        team1: team1,
        team2: team2,
      };
    }
    const styles = getComputedStyle(document.documentElement);
    function resolve(token: string) {
      return styles.getPropertyValue(token).trim();
    }
    function resolveTeam(c: string) {
      return c.startsWith("var(") ? resolve(c.slice(4, -1)) : c;
    }
    return {
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
            HEATMAP_RAMP
          ),
    [activePoints, imageWidth, imageHeight, killsOnly]
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

    const currentView = view;
    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = containerSize.width * dpr;
    canvas.height = containerSize.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = themeTokens.background;
    ctx.fillRect(0, 0, containerSize.width, containerSize.height);

    ctx.save();
    ctx.translate(containerSize.width / 2, containerSize.height / 2);
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
    containerSize,
    view,
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

  const [hoveredKill, setHoveredKill] = useState<{
    kill: KillPoint;
    screenX: number;
    screenY: number;
  } | null>(null);

  function screenToImage(screenX: number, screenY: number) {
    return {
      u:
        (screenX - containerSize.width / 2) / view.zoom +
        imageWidth / 2 -
        view.offsetX / view.zoom,
      v:
        (screenY - containerSize.height / 2) / view.zoom +
        imageHeight / 2 -
        view.offsetY / view.zoom,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    handlers.onPointerMove(e);
    if (isDragging.current) {
      if (hoveredKill) setHoveredKill(null);
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
              ({format.number(count)})
            </span>
          </button>
        ))}
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {t("total", { count: activePoints.length })}
        </span>
      </div>
      <div
        ref={containerRef}
        role="application"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus required for keyboard pan/zoom
        tabIndex={0}
        aria-describedby={killsOnly ? srListId : undefined}
        onKeyDown={handlers.onKeyDown}
        className="bg-background focus-visible:ring-ring/50 relative min-h-[500px] w-full overflow-hidden rounded-lg border outline-none focus-visible:ring-[3px]"
      >
        <canvas
          ref={canvasRef}
          aria-label={t("canvasLabel")}
          role="img"
          style={{ width: containerSize.width, height: containerSize.height }}
          className={`active:cursor-grabbing ${hoveredKill ? "cursor-pointer" : "cursor-grab"}`}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={handlers.onPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlers.onPointerUp}
        />
        {killsOnly && (
          <ul
            id={srListId}
            className="sr-only"
            aria-label={t("killEvents", { count: killPoints.length })}
          >
            {killPoints.map((kp) => (
              <li
                key={`${kp.matchTime}-${kp.attackerName}-${kp.attackerHero}-${kp.victimName}-${kp.victimHero}`}
              >
                {t("killEvent", {
                  attackerName: kp.attackerName,
                  attackerHero: kp.attackerHero,
                  victimName: kp.victimName,
                  victimHero: kp.victimHero,
                  time: toTimestamp(kp.matchTime),
                })}
              </li>
            ))}
          </ul>
        )}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">{t("loadingImage")}</p>
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
          {t("zoomHint", { zoom: Math.round(view.zoom * 100) })}
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
  const t = useTranslations("mapPage.heatmap.canvas");
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
        <span>{kill.ability === "0" ? t("primaryFire") : kill.ability}</span>
      </div>
    </div>
  );
}
