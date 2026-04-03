"use client";

import type { MapTransform } from "@/lib/map-calibration/types";
import {
  imageToWorld,
  worldToImage,
} from "@/lib/map-calibration/world-to-image";
import { useCallback, useEffect, useRef, useState } from "react";

type Anchor = {
  imageU: number;
  imageV: number;
  label: string | null;
};

type TestPoint = {
  worldX: number;
  worldY: number;
  label?: string;
};

type MapCanvasProps = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  anchors: Anchor[];
  transform: MapTransform | null;
  testPoints: TestPoint[];
  onImageClick: (imageU: number, imageV: number) => void;
};

function toUV(p: { u: number; v: number }): [number, number] {
  return [p.u, p.v];
}

const ANCHOR_RADIUS = 8;
const ANCHOR_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export function MapCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  anchors,
  transform,
  testPoints,
  onImageClick,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [view, setView] = useState({ offsetX: 0, offsetY: 0, zoom: 1 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);

      // Fit image to canvas on first load
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

  const imgToScreen = useCallback(
    (imgX: number, imgY: number) => ({
      x:
        canvasSize.width / 2 +
        (imgX - imageWidth / 2 + view.offsetX / view.zoom) * view.zoom,
      y:
        canvasSize.height / 2 +
        (imgY - imageHeight / 2 + view.offsetY / view.zoom) * view.zoom,
    }),
    [canvasSize, view, imageWidth, imageHeight]
  );

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
    ctx.restore();

    if (transform && showGrid) {
      const corners = [
        imageToWorld(0, 0, transform),
        imageToWorld(imageWidth, 0, transform),
        imageToWorld(0, imageHeight, transform),
        imageToWorld(imageWidth, imageHeight, transform),
      ];
      const worldMinX = Math.min(...corners.map((c) => c.x));
      const worldMaxX = Math.max(...corners.map((c) => c.x));
      const worldMinY = Math.min(...corners.map((c) => c.y));
      const worldMaxY = Math.max(...corners.map((c) => c.y));

      // Pick a grid spacing that gives roughly 10-30 lines
      const worldSpan = Math.max(worldMaxX - worldMinX, worldMaxY - worldMinY);
      const rawStep = worldSpan / 20;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const gridStep =
        rawStep < 2 * magnitude
          ? magnitude
          : rawStep < 5 * magnitude
            ? 2 * magnitude
            : 5 * magnitude;

      const startX = Math.floor(worldMinX / gridStep) * gridStep;
      const startY = Math.floor(worldMinY / gridStep) * gridStep;

      ctx.strokeStyle = "rgba(59, 130, 246, 0.45)";
      ctx.lineWidth = 1;

      for (let wx = startX; wx <= worldMaxX; wx += gridStep) {
        const top = worldToImage({ x: wx, y: worldMaxY }, transform);
        const bot = worldToImage({ x: wx, y: worldMinY }, transform);
        const sTop = imgToScreen(top.u, top.v);
        const sBot = imgToScreen(bot.u, bot.v);
        ctx.beginPath();
        ctx.moveTo(sTop.x, sTop.y);
        ctx.lineTo(sBot.x, sBot.y);
        ctx.stroke();
      }

      for (let wy = startY; wy <= worldMaxY; wy += gridStep) {
        const left = worldToImage({ x: worldMinX, y: wy }, transform);
        const right = worldToImage({ x: worldMaxX, y: wy }, transform);
        const sLeft = imgToScreen(left.u, left.v);
        const sRight = imgToScreen(right.u, right.v);
        ctx.beginPath();
        ctx.moveTo(sLeft.x, sLeft.y);
        ctx.lineTo(sRight.x, sRight.y);
        ctx.stroke();
      }

      // Origin axes
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.lineWidth = 2;
      const sAxL = imgToScreen(
        ...toUV(worldToImage({ x: worldMinX, y: 0 }, transform))
      );
      const sAxR = imgToScreen(
        ...toUV(worldToImage({ x: worldMaxX, y: 0 }, transform))
      );
      ctx.beginPath();
      ctx.moveTo(sAxL.x, sAxL.y);
      ctx.lineTo(sAxR.x, sAxR.y);
      ctx.stroke();
      const sAyT = imgToScreen(
        ...toUV(worldToImage({ x: 0, y: worldMaxY }, transform))
      );
      const sAyB = imgToScreen(
        ...toUV(worldToImage({ x: 0, y: worldMinY }, transform))
      );
      ctx.beginPath();
      ctx.moveTo(sAyT.x, sAyT.y);
      ctx.lineTo(sAyB.x, sAyB.y);
      ctx.stroke();

      // Origin dot + label
      const origin = worldToImage({ x: 0, y: 0 }, transform);
      const sOrigin = imgToScreen(origin.u, origin.v);
      ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
      ctx.beginPath();
      ctx.arc(sOrigin.x, sOrigin.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("(0, 0)", sOrigin.x + 8, sOrigin.y - 4);
    }

    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const screen = imgToScreen(anchor.imageU, anchor.imageV);
      const color = ANCHOR_COLORS[i % ANCHOR_COLORS.length];

      // Crosshair
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(screen.x - 12, screen.y);
      ctx.lineTo(screen.x + 12, screen.y);
      ctx.moveTo(screen.x, screen.y - 12);
      ctx.lineTo(screen.x, screen.y + 12);
      ctx.stroke();

      // Circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, ANCHOR_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Number label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), screen.x, screen.y);

      // Text label
      if (anchor.label) {
        ctx.fillStyle = color;
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(anchor.label, screen.x + 14, screen.y + 4);
      }
    }

    if (transform && testPoints.length > 0) {
      for (const tp of testPoints) {
        const imgPos = worldToImage({ x: tp.worldX, y: tp.worldY }, transform);
        const screen = imgToScreen(imgPos.u, imgPos.v);

        // Diamond marker
        ctx.fillStyle = "#00ff88";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - 7);
        ctx.lineTo(screen.x + 7, screen.y);
        ctx.lineTo(screen.x, screen.y + 7);
        ctx.lineTo(screen.x - 7, screen.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (tp.label) {
          ctx.fillStyle = "#00ff88";
          ctx.font = "11px system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(tp.label, screen.x + 10, screen.y + 4);
        }
      }
    }
  }, [
    canvasSize,
    view,
    imageLoaded,
    imageWidth,
    imageHeight,
    anchors,
    transform,
    testPoints,
    showGrid,
    imgToScreen,
  ]);

  useEffect(() => {
    requestAnimationFrame(render);
  }, [render]);

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
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
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

  function handlePointerUp(e: React.PointerEvent) {
    if (!draggingRef.current) return;

    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    if (dx < 3 && dy < 3) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const { u, v } = screenToImage(
          e.clientX - rect.left,
          e.clientY - rect.top
        );
        if (u >= 0 && u <= imageWidth && v >= 0 && v <= imageHeight) {
          onImageClick(Math.round(u), Math.round(v));
        }
      }
    }

    draggingRef.current = false;
  }

  // Attach wheel handler imperatively with { passive: false } so
  // preventDefault() works (React's onWheel is passive by default).
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

  return (
    <div
      ref={containerRef}
      className="bg-background relative h-full min-h-[500px] w-full overflow-hidden rounded-lg border"
    >
      <canvas
        ref={canvasRef}
        aria-label="Map calibration canvas. Click to place anchor points, drag to pan, scroll to zoom."
        role="img"
        style={{ width: canvasSize.width, height: canvasSize.height }}
        className="cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {!imageLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">Loading map image…</p>
        </div>
      ) : null}
      <div className="absolute right-2 bottom-2 flex items-center gap-3 rounded-md bg-black/60 px-2.5 py-1.5 text-xs backdrop-blur-sm">
        {transform ? (
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className={`rounded px-1.5 py-0.5 transition-colors ${
              showGrid
                ? "bg-blue-500/20 text-blue-400"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            Grid {showGrid ? "ON" : "OFF"}
          </button>
        ) : null}
        <span className="text-white/60">
          {Math.round(view.zoom * 100)}% · Scroll to zoom · Drag to pan · Click
          to place
        </span>
      </div>
    </div>
  );
}
