"use client";

import { useMapViewport } from "@/components/map/use-map-viewport";
import { clampZoom, getMinZoom } from "@/components/map/viewport-math";
import type { RouteAnalysis } from "@/lib/routes/routes-db";
import type { MapTransform } from "@/lib/map-calibration/types";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Outcome = "WON" | "LOST" | "UNKNOWN";

type RoutesViewProps = {
  analysis: RouteAnalysis;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  transform: MapTransform;
};

const OUTCOME_COLORS: Record<Outcome, string> = {
  WON: "#22c55e",
  LOST: "#ef4444",
  UNKNOWN: "#9ca3af",
};

const ALL = "__all__";

export function RoutesView({
  analysis,
  imageUrl,
  imageWidth,
  imageHeight,
  transform,
}: RoutesViewProps) {
  const { routes, clusters, team1Name, team2Name } = analysis;

  // Map each route index to the cluster that contains it (for highlighting
  // and for the "show only medoids" performance guard).
  const clusterOfRoute = useMemo(() => {
    const map = new Map<number, number>();
    clusters.forEach((cluster, ci) => {
      for (const idx of cluster.routeIndexes) map.set(idx, ci);
    });
    return map;
  }, [clusters]);

  const medoidRouteIndexes = useMemo(
    () => new Set(clusters.map((c) => c.medoidIndex)),
    [clusters]
  );

  // Filter options derived from the data.
  const teamOptions = useMemo(
    () => [team1Name, team2Name].filter((v, i, a) => a.indexOf(v) === i),
    [team1Name, team2Name]
  );
  const playerOptions = useMemo(
    () => [...new Set(routes.map((r) => r.playerName))].sort(),
    [routes]
  );
  const roundOptions = useMemo(
    () => [...new Set(routes.map((r) => r.roundNumber))].sort((a, b) => a - b),
    [routes]
  );

  const [team, setTeam] = useState<string>(ALL);
  const [player, setPlayer] = useState<string>(ALL);
  const [round, setRound] = useState<string>(ALL);
  const [outcome, setOutcome] = useState<string>(ALL);
  const [kind, setKind] = useState<string>(ALL);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  function passesFilters(routeIndex: number): boolean {
    const r = routes[routeIndex];
    if (team !== ALL && r.playerTeam !== team) return false;
    if (player !== ALL && r.playerName !== player) return false;
    if (round !== ALL && String(r.roundNumber) !== round) return false;
    if (outcome !== ALL && r.outcome !== outcome) return false;
    if (kind !== ALL && r.kind !== kind) return false;
    if (
      selectedCluster !== null &&
      clusterOfRoute.get(routeIndex) !== selectedCluster
    )
      return false;
    return true;
  }

  // Which route indexes to draw: medoids only unless "show all routes".
  const visibleRouteIndexes = useMemo(() => {
    const indexes: number[] = [];
    for (let i = 0; i < routes.length; i++) {
      if (!showAll && !medoidRouteIndexes.has(i)) continue;
      if (!passesFilters(i)) continue;
      indexes.push(i);
    }
    return indexes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    routes,
    showAll,
    medoidRouteIndexes,
    team,
    player,
    round,
    outcome,
    kind,
    selectedCluster,
  ]);

  const activeCluster = selectedCluster ?? hoveredCluster;

  // Calibration sanity: when most route points map outside the image, the
  // map's calibration is wrong and the drawing would be meaningless noise.
  const calibrationSuspect = useMemo(() => {
    let inside = 0;
    let total = 0;
    for (const route of routes) {
      for (const p of route.points) {
        const { u, v } = worldToImage({ x: p.x, y: p.z }, transform);
        total++;
        if (u >= 0 && v >= 0 && u <= imageWidth && v <= imageHeight) inside++;
      }
    }
    return total > 0 && inside / total < 0.5;
  }, [routes, transform, imageWidth, imageHeight]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <RouteFilters
          teamOptions={teamOptions}
          playerOptions={playerOptions}
          roundOptions={roundOptions}
          team={team}
          player={player}
          round={round}
          outcome={outcome}
          kind={kind}
          showAll={showAll}
          onTeam={setTeam}
          onPlayer={setPlayer}
          onRound={setRound}
          onOutcome={setOutcome}
          onKind={setKind}
          onShowAll={setShowAll}
        />
        <RouteCanvas
          routes={routes}
          visibleRouteIndexes={visibleRouteIndexes}
          clusterOfRoute={clusterOfRoute}
          activeCluster={activeCluster}
          imageUrl={imageUrl}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          transform={transform}
          calibrationSuspect={calibrationSuspect}
        />
      </div>
      <ClusterList
        clusters={clusters}
        routes={routes}
        selectedCluster={selectedCluster}
        onSelect={(ci) =>
          setSelectedCluster((prev) => (prev === ci ? null : ci))
        }
        onHover={setHoveredCluster}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-background h-8 rounded-md border px-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RouteFilters({
  teamOptions,
  playerOptions,
  roundOptions,
  team,
  player,
  round,
  outcome,
  kind,
  showAll,
  onTeam,
  onPlayer,
  onRound,
  onOutcome,
  onKind,
  onShowAll,
}: {
  teamOptions: string[];
  playerOptions: string[];
  roundOptions: number[];
  team: string;
  player: string;
  round: string;
  outcome: string;
  kind: string;
  showAll: boolean;
  onTeam: (v: string) => void;
  onPlayer: (v: string) => void;
  onRound: (v: string) => void;
  onOutcome: (v: string) => void;
  onKind: (v: string) => void;
  onShowAll: (v: boolean) => void;
}) {
  const t = useTranslations("mapPage.routes");
  const all = t("filters.all");
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label={t("filters.team")}
        value={team}
        onChange={onTeam}
        options={[
          { value: ALL, label: all },
          ...teamOptions.map((tm) => ({ value: tm, label: tm })),
        ]}
      />
      <Select
        label={t("filters.player")}
        value={player}
        onChange={onPlayer}
        options={[
          { value: ALL, label: all },
          ...playerOptions.map((p) => ({ value: p, label: p })),
        ]}
      />
      <Select
        label={t("filters.round")}
        value={round}
        onChange={onRound}
        options={[
          { value: ALL, label: all },
          ...roundOptions.map((r) => ({
            value: String(r),
            label: String(r),
          })),
        ]}
      />
      <Select
        label={t("filters.outcome")}
        value={outcome}
        onChange={onOutcome}
        options={[
          { value: ALL, label: all },
          { value: "WON", label: t("outcomes.won") },
          { value: "LOST", label: t("outcomes.lost") },
          { value: "UNKNOWN", label: t("outcomes.unknown") },
        ]}
      />
      <Select
        label={t("filters.kind")}
        value={kind}
        onChange={onKind}
        options={[
          { value: ALL, label: all },
          { value: "INITIAL", label: t("kinds.initial") },
          { value: "RESPAWN", label: t("kinds.respawn") },
        ]}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(e) => onShowAll(e.target.checked)}
          className="h-4 w-4"
        />
        {t("showAll")}
      </label>
    </div>
  );
}

function RouteCanvas({
  routes,
  visibleRouteIndexes,
  clusterOfRoute,
  activeCluster,
  imageUrl,
  imageWidth,
  imageHeight,
  transform,
  calibrationSuspect,
}: {
  routes: RouteAnalysis["routes"];
  visibleRouteIndexes: number[];
  clusterOfRoute: Map<number, number>;
  activeCluster: number | null;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  transform: MapTransform;
  calibrationSuspect: boolean;
}) {
  const t = useTranslations("mapPage.routes");
  const [imageLoaded, setImageLoaded] = useState(false);
  const { containerRef, containerSize, view, setView, handlers } =
    useMapViewport({
      imageWidth,
      imageHeight,
      imageLoaded,
    });

  useEffect(() => {
    setImageLoaded(false);
    const img = new globalThis.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImageLoaded(true);
    img.src = imageUrl;
  }, [imageUrl]);

  const polylines = useMemo(() => {
    return visibleRouteIndexes.map((idx) => {
      const route = routes[idx];
      const ci = clusterOfRoute.get(idx) ?? null;
      const pts = route.points.map((p) => {
        const { u, v } = worldToImage({ x: p.x, y: p.z }, transform);
        return { u, v };
      });
      const points = pts
        .map(({ u, v }) => `${u.toFixed(1)},${v.toFixed(1)}`)
        .join(" ");
      const highlighted = activeCluster === null || activeCluster === ci;
      return {
        key: idx,
        pts,
        points,
        color: OUTCOME_COLORS[route.outcome],
        highlighted,
      };
    });
  }, [visibleRouteIndexes, routes, clusterOfRoute, transform, activeCluster]);

  // Bounding box of the drawn routes in image space (clamped to the image
  // so a broken calibration can't explode the view).
  const contentBounds = useMemo(() => {
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const pl of polylines) {
      for (const { u, v } of pl.pts) {
        if (u < 0 || v < 0 || u > imageWidth || v > imageHeight) continue;
        minU = Math.min(minU, u);
        maxU = Math.max(maxU, u);
        minV = Math.min(minV, v);
        maxV = Math.max(maxV, v);
      }
    }
    if (minU === Infinity || maxU - minU < 1 || maxV - minV < 1) return null;
    return { minU, maxU, minV, maxV };
  }, [polylines, imageWidth, imageHeight]);

  // Fit the initial view to the routes, not the whole map image — the
  // playable area is a fraction of these 8192px images, and a whole-image
  // fit renders routes microscopic. Runs once per image; the user pans and
  // zooms freely afterwards.
  const fittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!imageLoaded || !contentBounds) return;
    if (fittedRef.current === imageUrl) return;
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw <= 0 || ch <= 0) return;

    const pad = 1.25;
    const bw = (contentBounds.maxU - contentBounds.minU) * pad;
    const bh = (contentBounds.maxV - contentBounds.minV) * pad;
    const minZoom = getMinZoom(ch, imageHeight);
    const zoom = clampZoom(Math.min(cw / bw, ch / bh), minZoom);
    const centerU = (contentBounds.minU + contentBounds.maxU) / 2;
    const centerV = (contentBounds.minV + contentBounds.maxV) / 2;
    setView({
      zoom,
      offsetX: (imageWidth / 2 - centerU) * zoom,
      offsetY: (imageHeight / 2 - centerV) * zoom,
    });
    fittedRef.current = imageUrl;
  }, [
    imageLoaded,
    contentBounds,
    imageUrl,
    imageWidth,
    imageHeight,
    containerRef,
    setView,
  ]);

  const { width: cw, height: ch } = containerSize;
  const layerTransform = `translate(${cw / 2}px, ${ch / 2}px) scale(${view.zoom}) translate(${-imageWidth / 2 + view.offsetX / view.zoom}px, ${-imageHeight / 2 + view.offsetY / view.zoom}px)`;

  if (calibrationSuspect) {
    return (
      <div className="border-destructive/40 bg-destructive/10 flex min-h-[200px] items-center justify-center rounded-lg border p-6">
        <p className="text-destructive max-w-prose text-sm">
          {t("calibrationWarning")}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="application"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus required for keyboard pan/zoom
      tabIndex={0}
      onKeyDown={handlers.onKeyDown}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      className="bg-background focus-visible:ring-ring/50 relative min-h-[500px] w-full cursor-grab overflow-hidden rounded-lg border outline-none focus-visible:ring-[3px] active:cursor-grabbing"
    >
      {imageLoaded && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: imageWidth,
            height: imageHeight,
            transformOrigin: "0 0",
            transform: layerTransform,
          }}
        >
          {/* oxlint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={t("canvasLabel")}
            width={imageWidth}
            height={imageHeight}
            draggable={false}
            className="pointer-events-none absolute inset-0 max-w-none select-none"
          />
          <svg
            className="pointer-events-none absolute inset-0"
            width={imageWidth}
            height={imageHeight}
            role="img"
            aria-label={t("canvasLabel")}
          >
            {/* casing pass: dark halo so lines read over busy map art */}
            {polylines.map((pl) => (
              <polyline
                key={`casing-${pl.key}`}
                points={pl.points}
                fill="none"
                stroke="#09090b"
                strokeWidth={pl.highlighted ? 5.5 : 4}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={pl.highlighted ? 0.85 : 0.2}
              />
            ))}
            {polylines.map((pl) => (
              <polyline
                key={pl.key}
                points={pl.points}
                fill="none"
                stroke={pl.color}
                strokeWidth={pl.highlighted ? 3 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={pl.highlighted ? 0.95 : 0.25}
              />
            ))}
            {/* direction markers: dot at spawn, arrowhead at first contact */}
            {polylines.map((pl) => {
              if (pl.pts.length < 2) return null;
              const start = pl.pts[0];
              const end = pl.pts[pl.pts.length - 1];
              const prev = pl.pts[pl.pts.length - 2];
              const angle =
                (Math.atan2(end.v - prev.v, end.u - prev.u) * 180) / Math.PI;
              const size = 9 / view.zoom;
              return (
                <g key={`marker-${pl.key}`} opacity={pl.highlighted ? 0.95 : 0.25}>
                  <circle
                    cx={start.u}
                    cy={start.v}
                    r={4 / view.zoom}
                    fill={pl.color}
                    stroke="#09090b"
                    strokeWidth={1.5 / view.zoom}
                  />
                  <polygon
                    points={`0,${-size / 2} ${size},0 0,${size / 2}`}
                    transform={`translate(${end.u}, ${end.v}) rotate(${angle})`}
                    fill={pl.color}
                    stroke="#09090b"
                    strokeWidth={1 / view.zoom}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">{t("loadingImage")}</p>
        </div>
      )}
      <div className="bg-popover/95 text-muted-foreground absolute right-2 bottom-2 rounded-md border px-2.5 py-1.5 text-xs">
        {t("zoomHint", { zoom: Math.round(view.zoom * 100) })}
      </div>
    </div>
  );
}

function ClusterList({
  clusters,
  routes,
  selectedCluster,
  onSelect,
  onHover,
}: {
  clusters: RouteAnalysis["clusters"];
  routes: RouteAnalysis["routes"];
  selectedCluster: number | null;
  onSelect: (ci: number) => void;
  onHover: (ci: number | null) => void;
}) {
  const t = useTranslations("mapPage.routes");
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold tracking-tight">
        {t("clusters.header")}
      </h3>
      <ul className="space-y-1.5">
        {clusters.map((cluster, ci) => {
          const memberCount = cluster.routeIndexes.length;
          const { won, lost, unknown } = cluster.outcomes;
          const label = cluster.label ?? t("routeFallback", { n: ci + 1 });
          const medoidColor =
            OUTCOME_COLORS[routes[cluster.medoidIndex]?.outcome ?? "UNKNOWN"];
          const selected = selectedCluster === ci;
          return (
            <li key={`cluster-${cluster.medoidIndex}`}>
              <button
                type="button"
                onClick={() => onSelect(ci)}
                onMouseEnter={() => onHover(ci)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(ci)}
                onBlur={() => onHover(null)}
                aria-pressed={selected}
                className={`flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: medoidColor }}
                  />
                  {label}
                </span>
                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {t("clusters.routes", { count: memberCount })}
                </span>
                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {t("clusters.outcomes", { won, lost, unknown })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
