"use client";

import type { RouteAnalysis } from "@/lib/routes/routes-db";
import type { MapTransform } from "@/lib/map-calibration/types";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import { useEffect, useId, useMemo, useRef, useState } from "react";

type Outcome = "WON" | "LOST" | "UNKNOWN";

type RoutesViewLabels = {
  filters: {
    team: string;
    player: string;
    round: string;
    outcome: string;
    kind: string;
    cluster: string;
    all: string;
  };
  outcomes: { won: string; lost: string; unknown: string };
  kinds: { INITIAL: string; RESPAWN: string };
  showAll: string;
  clusterHeader: string;
  routesLabel: string;
  outcomesLabel: string;
  routeFallback: string;
  loadingImage: string;
  canvasLabel: string;
};

type RoutesViewProps = {
  analysis: RouteAnalysis;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  transform: MapTransform;
  labels: RoutesViewLabels;
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
  labels,
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

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <RouteFilters
          labels={labels}
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
          labels={labels}
        />
      </div>
      <ClusterList
        clusters={clusters}
        routes={routes}
        labels={labels}
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
  labels,
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
  labels: RoutesViewLabels;
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
  const all = labels.filters.all;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label={labels.filters.team}
        value={team}
        onChange={onTeam}
        options={[
          { value: ALL, label: all },
          ...teamOptions.map((tm) => ({ value: tm, label: tm })),
        ]}
      />
      <Select
        label={labels.filters.player}
        value={player}
        onChange={onPlayer}
        options={[
          { value: ALL, label: all },
          ...playerOptions.map((p) => ({ value: p, label: p })),
        ]}
      />
      <Select
        label={labels.filters.round}
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
        label={labels.filters.outcome}
        value={outcome}
        onChange={onOutcome}
        options={[
          { value: ALL, label: all },
          { value: "WON", label: labels.outcomes.won },
          { value: "LOST", label: labels.outcomes.lost },
          { value: "UNKNOWN", label: labels.outcomes.unknown },
        ]}
      />
      <Select
        label={labels.filters.kind}
        value={kind}
        onChange={onKind}
        options={[
          { value: ALL, label: all },
          { value: "INITIAL", label: labels.kinds.INITIAL },
          { value: "RESPAWN", label: labels.kinds.RESPAWN },
        ]}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(e) => onShowAll(e.target.checked)}
          className="h-4 w-4"
        />
        {labels.showAll}
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
  labels,
}: {
  routes: RouteAnalysis["routes"];
  visibleRouteIndexes: number[];
  clusterOfRoute: Map<number, number>;
  activeCluster: number | null;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  transform: MapTransform;
  labels: RoutesViewLabels;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(imageWidth);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setImageLoaded(false);
    const img = new globalThis.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImageLoaded(true);
    img.src = imageUrl;
  }, [imageUrl]);

  // Static fit-to-width: scale the image down to the container width and
  // place every route point with the same scale factor.
  const scale = canvasWidth / imageWidth;
  const canvasHeight = imageHeight * scale;

  const polylines = useMemo(() => {
    return visibleRouteIndexes.map((idx) => {
      const route = routes[idx];
      const ci = clusterOfRoute.get(idx) ?? null;
      const points = route.points
        .map((p) => {
          const { u, v } = worldToImage({ x: p.x, y: p.z }, transform);
          return `${(u * scale).toFixed(1)},${(v * scale).toFixed(1)}`;
        })
        .join(" ");
      const highlighted = activeCluster === null || activeCluster === ci;
      return {
        key: idx,
        points,
        color: OUTCOME_COLORS[route.outcome],
        highlighted,
      };
    });
  }, [
    visibleRouteIndexes,
    routes,
    clusterOfRoute,
    transform,
    scale,
    activeCluster,
  ]);

  return (
    <div
      ref={containerRef}
      className="bg-background relative w-full overflow-hidden rounded-lg border"
      style={{ height: imageLoaded ? canvasHeight : 500 }}
    >
      {imageLoaded && (
        // oxlint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={labels.canvasLabel}
          width={canvasWidth}
          height={canvasHeight}
          draggable={false}
          className="pointer-events-none absolute inset-0 max-w-none select-none"
        />
      )}
      {imageLoaded && (
        <svg
          className="pointer-events-none absolute inset-0"
          width={canvasWidth}
          height={canvasHeight}
          role="img"
          aria-label={labels.canvasLabel}
        >
          {polylines.map((pl) => (
            <polyline
              key={pl.key}
              points={pl.points}
              fill="none"
              stroke={pl.color}
              strokeWidth={pl.highlighted ? 3 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={pl.highlighted ? 0.95 : 0.25}
            />
          ))}
        </svg>
      )}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">{labels.loadingImage}</p>
        </div>
      )}
    </div>
  );
}

function ClusterList({
  clusters,
  routes,
  labels,
  selectedCluster,
  onSelect,
  onHover,
}: {
  clusters: RouteAnalysis["clusters"];
  routes: RouteAnalysis["routes"];
  labels: RoutesViewLabels;
  selectedCluster: number | null;
  onSelect: (ci: number) => void;
  onHover: (ci: number | null) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold tracking-tight">
        {labels.clusterHeader}
      </h3>
      <ul className="space-y-1.5">
        {clusters.map((cluster, ci) => {
          const memberCount = cluster.routeIndexes.length;
          const { won, lost, unknown } = cluster.outcomes;
          const label =
            cluster.label ??
            labels.routeFallback.replace("{n}", String(ci + 1));
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
                  {labels.routesLabel.replace("{count}", String(memberCount))}
                </span>
                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {labels.outcomesLabel
                    .replace("{won}", String(won))
                    .replace("{lost}", String(lost))
                    .replace("{unknown}", String(unknown))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
