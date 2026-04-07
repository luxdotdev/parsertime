"use client";

import {
  renderDrawingResolved,
  screenToImage,
} from "@/lib/coaching/draw-utils";
import type {
  ArrowStroke,
  DrawingElement,
  PenStroke,
  Point,
  Tool,
} from "@/lib/coaching/types";
import { coachingCanvasStore } from "@/stores/coaching-canvas-store";
import { useSelector } from "@xstate/store/react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

type CanvasRendererProps = {
  onCanvasClick?: (imagePoint: Point) => void;
};

function toolCursor(tool: Tool) {
  switch (tool) {
    case "select":
      return "grab";
    case "pen":
      return "crosshair";
    case "arrow":
      return "crosshair";
    case "eraser":
      return "pointer";
  }
}

export function CanvasRenderer({ onCanvasClick }: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const mapImageUrl = useSelector(
    coachingCanvasStore,
    (s) => s.context.mapImageUrl
  );
  const mapImageWidth = useSelector(
    coachingCanvasStore,
    (s) => s.context.mapImageWidth
  );
  const mapImageHeight = useSelector(
    coachingCanvasStore,
    (s) => s.context.mapImageHeight
  );
  const drawings = useSelector(coachingCanvasStore, (s) => s.context.drawings);
  const activeTool = useSelector(
    coachingCanvasStore,
    (s) => s.context.activeTool
  );
  const strokeColor = useSelector(
    coachingCanvasStore,
    (s) => s.context.strokeColor
  );
  const strokeWidth = useSelector(
    coachingCanvasStore,
    (s) => s.context.strokeWidth
  );
  const view = useSelector(coachingCanvasStore, (s) => s.context.view);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const viewAtDragStartRef = useRef(view);

  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const arrowStartRef = useRef<Point | null>(null);
  const activePreviewRef = useRef<DrawingElement | null>(null);

  useEffect(() => {
    if (!mapImageUrl) {
      imageRef.current = null;
      setImageLoaded(false);
      return;
    }
    const img = new globalThis.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);

      if (containerRef.current) {
        const fitZoom = Math.min(
          containerRef.current.clientWidth / mapImageWidth,
          containerRef.current.clientHeight / mapImageHeight
        );
        coachingCanvasStore.send({
          type: "setView",
          offsetX: 0,
          offsetY: 0,
          zoom: fitZoom,
        });
      }
    };
    img.src = mapImageUrl;
  }, [mapImageUrl, mapImageWidth, mapImageHeight]);

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

  const toImageSpace = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return screenToImage(
        clientX - rect.left,
        clientY - rect.top,
        canvasSize.width,
        canvasSize.height,
        mapImageWidth,
        mapImageHeight,
        view
      );
    },
    [canvasSize, mapImageWidth, mapImageHeight, view]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    const bgColor =
      getComputedStyle(canvas).getPropertyValue("--color-background");
    ctx.fillStyle = bgColor.trim() || "#0a0a0a";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (!img || !imageLoaded) return;

    ctx.save();
    ctx.translate(canvasSize.width / 2, canvasSize.height / 2);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(
      -mapImageWidth / 2 + view.offsetX / view.zoom,
      -mapImageHeight / 2 + view.offsetY / view.zoom
    );

    ctx.drawImage(img, 0, 0, mapImageWidth, mapImageHeight);

    const styles = getComputedStyle(canvas);
    for (const d of drawings) {
      renderDrawingResolved(ctx, d, styles);
    }

    const preview = activePreviewRef.current;
    if (preview) {
      ctx.globalAlpha = 0.6;
      renderDrawingResolved(ctx, preview, styles);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, [canvasSize, imageLoaded, view, mapImageWidth, mapImageHeight, drawings]);

  useEffect(() => {
    const id = requestAnimationFrame(render);
    return () => cancelAnimationFrame(id);
  }, [render]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (activeTool === "select") {
        if (onCanvasClick) {
          const imgPoint = toImageSpace(e.clientX, e.clientY);
          onCanvasClick(imgPoint);
          return;
        }
        draggingRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        viewAtDragStartRef.current = view;
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      if (activeTool === "pen") {
        drawingRef.current = true;
        currentStrokeRef.current = [toImageSpace(e.clientX, e.clientY)];
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      if (activeTool === "arrow") {
        arrowStartRef.current = toImageSpace(e.clientX, e.clientY);
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      if (activeTool === "eraser") {
        const imgPoint = toImageSpace(e.clientX, e.clientY);
        coachingCanvasStore.send({
          type: "eraseAt",
          point: imgPoint,
          radius: 15 / view.zoom,
        });
        drawingRef.current = true;
        canvas.setPointerCapture(e.pointerId);
      }
    },
    [activeTool, toImageSpace, view, onCanvasClick]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (activeTool === "select" && draggingRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        coachingCanvasStore.send({
          type: "setView",
          offsetX: viewAtDragStartRef.current.offsetX + dx,
          offsetY: viewAtDragStartRef.current.offsetY + dy,
          zoom: view.zoom,
        });
        return;
      }

      if (activeTool === "pen" && drawingRef.current) {
        const point = toImageSpace(e.clientX, e.clientY);
        currentStrokeRef.current.push(point);
        activePreviewRef.current = {
          id: "preview",
          type: "pen",
          points: [...currentStrokeRef.current],
          color: strokeColor,
          width: strokeWidth / view.zoom,
        };
        requestAnimationFrame(render);
        return;
      }

      if (activeTool === "arrow" && arrowStartRef.current) {
        const end = toImageSpace(e.clientX, e.clientY);
        activePreviewRef.current = {
          id: "preview",
          type: "arrow",
          start: arrowStartRef.current,
          end,
          color: strokeColor,
          width: strokeWidth / view.zoom,
        };
        requestAnimationFrame(render);
        return;
      }

      if (activeTool === "eraser" && drawingRef.current) {
        const imgPoint = toImageSpace(e.clientX, e.clientY);
        coachingCanvasStore.send({
          type: "eraseAt",
          point: imgPoint,
          radius: 15 / view.zoom,
        });
      }
    },
    [activeTool, toImageSpace, view, strokeColor, strokeWidth, render]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (activeTool === "select") {
        draggingRef.current = false;
        return;
      }

      if (activeTool === "pen" && drawingRef.current) {
        drawingRef.current = false;
        activePreviewRef.current = null;
        if (currentStrokeRef.current.length >= 2) {
          const stroke: PenStroke = {
            id: nanoid(),
            type: "pen",
            points: currentStrokeRef.current,
            color: strokeColor,
            width: strokeWidth / view.zoom,
          };
          coachingCanvasStore.send({ type: "addDrawing", drawing: stroke });
        }
        currentStrokeRef.current = [];
        return;
      }

      if (activeTool === "arrow" && arrowStartRef.current) {
        const end = toImageSpace(e.clientX, e.clientY);
        activePreviewRef.current = null;
        const arrow: ArrowStroke = {
          id: nanoid(),
          type: "arrow",
          start: arrowStartRef.current,
          end,
          color: strokeColor,
          width: strokeWidth / view.zoom,
        };
        coachingCanvasStore.send({ type: "addDrawing", drawing: arrow });
        arrowStartRef.current = null;
        return;
      }

      if (activeTool === "eraser") {
        drawingRef.current = false;
      }
    },
    [activeTool, toImageSpace, strokeColor, strokeWidth, view]
  );

  // Native wheel listener with passive: false to prevent page scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const ctx = coachingCanvasStore.getSnapshot().context;
      const minZoom =
        ctx.mapImageHeight > 0
          ? canvasSize.height / ctx.mapImageHeight
          : 0.1;
      const currentView = ctx.view;
      const newZoom = Math.max(minZoom, Math.min(10, currentView.zoom * factor));
      if (newZoom <= minZoom) {
        coachingCanvasStore.send({
          type: "setView",
          offsetX: 0,
          offsetY: 0,
          zoom: newZoom,
        });
      } else {
        coachingCanvasStore.send({
          type: "setView",
          offsetX: currentView.offsetX,
          offsetY: currentView.offsetY,
          zoom: newZoom,
        });
      }
    }
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvasSize.height]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ cursor: toolCursor(activeTool) }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
}
