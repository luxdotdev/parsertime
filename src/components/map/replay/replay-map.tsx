"use client";

import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import type { PlayerState } from "@/lib/replay/build-player-timeline";
import { worldToImage } from "@/lib/map-calibration/world-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReplayPlayerMarker } from "./replay-player-marker";

type PlayerRender = {
  key: string;
  playerName: string;
  playerTeam: string;
  state: PlayerState;
  isInactive: boolean;
};

type ReplayMapProps = {
  players: PlayerRender[];
  calibration: LoadedCalibration;
  team1Name: string;
  team1Color: string;
  team2Color: string;
  selectedPlayer: string | null;
  onSelectPlayerAction: (key: string | null) => void;
  recentKill: {
    attackerX: number;
    attackerZ: number;
    victimX: number;
    victimZ: number;
    attackerTeam: string;
  } | null;
};

const MARKER_SIZE = 32;

export function ReplayMap({
  players,
  calibration,
  team1Name,
  team1Color,
  team2Color,
  selectedPlayer,
  onSelectPlayerAction,
  recentKill,
}: ReplayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 600,
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [view, setView] = useState({ offsetX: 0, offsetY: 0, zoom: 1 });
  const previousViewRef = useRef(view);

  const { transform, imagePresignedUrl, imageWidth, imageHeight } = calibration;

  const containerSizeRef = useRef(containerSize);
  useEffect(() => {
    containerSizeRef.current = containerSize;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setImageLoaded(false);
    const img = new globalThis.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageLoaded(true);
      const container = containerRef.current;
      const cw = container?.clientWidth ?? containerSizeRef.current.width;
      const ch = container?.clientHeight ?? containerSizeRef.current.height;
      const fitZoom = Math.min(cw / imageWidth, ch / imageHeight);
      setView({ offsetX: 0, offsetY: 0, zoom: fitZoom });
    };
    img.src = imagePresignedUrl;
  }, [imagePresignedUrl, imageWidth, imageHeight]);

  const imgLeft =
    containerSize.width / 2 - (imageWidth / 2) * view.zoom + view.offsetX;
  const imgTop =
    containerSize.height / 2 - (imageHeight / 2) * view.zoom + view.offsetY;

  function worldToScreen(worldX: number, worldZ: number) {
    const pt = worldToImage({ x: worldX, y: worldZ }, transform);
    return {
      x: imgLeft + pt.u * view.zoom,
      y: imgTop + pt.v * view.zoom,
    };
  }

  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const dragRafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ dx: number; dy: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 0) {
      draggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    const pending = pendingDragRef.current ?? { dx: 0, dy: 0 };
    pending.dx += dx;
    pending.dy += dy;
    pendingDragRef.current = pending;
    if (dragRafRef.current != null) return;
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = null;
      const queued = pendingDragRef.current;
      pendingDragRef.current = null;
      if (!queued) return;
      const v = viewRef.current;
      viewRef.current = {
        ...v,
        offsetX: v.offsetX + queued.dx,
        offsetY: v.offsetY + queued.dy,
      };
      setView(viewRef.current);
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      if (dragRafRef.current != null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      const queued = pendingDragRef.current;
      pendingDragRef.current = null;
      if (queued) {
        const v = viewRef.current;
        viewRef.current = {
          ...v,
          offsetX: v.offsetX + queued.dx,
          offsetY: v.offsetY + queued.dy,
        };
      }
      setView(viewRef.current);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handler(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const cs = containerSizeRef.current;
      const minZoom = Math.min(cs.width / imageWidth, cs.height / imageHeight);

      const rect = container!.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setView((v) => {
        const newZoom = Math.max(minZoom, Math.min(10, v.zoom * factor));
        if (newZoom === v.zoom) return v;

        if (newZoom <= minZoom) {
          return { offsetX: 0, offsetY: 0, zoom: newZoom };
        }

        const scale = newZoom / v.zoom;
        const relX = cursorX - cs.width / 2;
        const relY = cursorY - cs.height / 2;
        const newOffsetX = scale * v.offsetX + relX * (1 - scale);
        const newOffsetY = scale * v.offsetY + relY * (1 - scale);

        return { offsetX: newOffsetX, offsetY: newOffsetY, zoom: newZoom };
      });
    }

    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, [imageWidth, imageHeight]);

  const imgStyle: React.CSSProperties = {
    position: "absolute",
    width: imageWidth * view.zoom,
    height: imageHeight * view.zoom,
    left: imgLeft,
    top: imgTop,
  };

  const previousView = previousViewRef.current;
  const didViewChange =
    previousView.offsetX !== view.offsetX ||
    previousView.offsetY !== view.offsetY ||
    previousView.zoom !== view.zoom;

  useEffect(() => {
    previousViewRef.current = view;
  }, [view]);

  const killLine = recentKill
    ? {
        from: worldToScreen(recentKill.attackerX, recentKill.attackerZ),
        to: worldToScreen(recentKill.victimX, recentKill.victimZ),
        color: recentKill.attackerTeam === team1Name ? team1Color : team2Color,
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="bg-background relative min-h-[500px] w-full cursor-grab overflow-hidden rounded-lg border active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Map image */}
      {imageLoaded && (
        // oxlint-disable-next-line @next/next/no-img-element
        <img
          src={imagePresignedUrl}
          alt="Map"
          style={imgStyle}
          draggable={false}
          className="pointer-events-none max-w-none select-none"
        />
      )}

      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">Loading map image...</p>
        </div>
      )}

      {/* Kill line */}
      {killLine && (
        <svg
          className="pointer-events-none absolute inset-0"
          width={containerSize.width}
          height={containerSize.height}
        >
          <line
            x1={killLine.from.x}
            y1={killLine.from.y}
            x2={killLine.to.x}
            y2={killLine.to.y}
            stroke={killLine.color}
            strokeWidth={2}
            strokeDasharray="6 4"
            opacity={0.9}
          />
        </svg>
      )}

      {/* Player markers */}
      {imageLoaded &&
        players.map((p) => {
          const screen = worldToScreen(p.state.x, p.state.z);
          const color = p.playerTeam === team1Name ? team1Color : team2Color;

          return (
            <ReplayPlayerMarker
              key={p.key}
              heroName={p.state.hero}
              color={color}
              x={screen.x}
              y={screen.y}
              size={MARKER_SIZE}
              isDead={p.state.isDead}
              isUlting={p.state.isUlting}
              isInactive={p.isInactive}
              playerName={p.playerName}
              isSelected={selectedPlayer === p.key}
              animatePosition={!didViewChange}
              onClick={() => onSelectPlayerAction(p.key)}
            />
          );
        })}

      {/* Zoom indicator */}
      <div className="bg-popover/95 text-muted-foreground absolute right-2 bottom-2 rounded-md border px-2.5 py-1.5 text-xs">
        {Math.round(view.zoom * 100)}% · Scroll to zoom · Drag to pan
      </div>
    </div>
  );
}
