"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyZoomFactor,
  getInitialFitZoom,
  getMinZoom,
  panBy,
  type View,
} from "./viewport-math";

type UseMapViewportOptions = {
  imageWidth: number;
  imageHeight: number;
  /** Fit-to-contain once the image has loaded and the container is measured. */
  imageLoaded: boolean;
};

export function useMapViewport({
  imageWidth,
  imageHeight,
  imageLoaded,
}: UseMapViewportOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 600,
  });
  const [view, setView] = useState<View>({ offsetX: 0, offsetY: 0, zoom: 1 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Track the container size.
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

  // Fit-to-contain when the image loads.
  useEffect(() => {
    if (!imageLoaded) return;
    const container = containerRef.current;
    if (!container) return;
    setView({
      offsetX: 0,
      offsetY: 0,
      zoom: getInitialFitZoom(
        container.clientWidth,
        container.clientHeight,
        imageWidth,
        imageHeight
      ),
    });
  }, [imageLoaded, imageWidth, imageHeight]);

  // Wheel zoom (non-passive so preventDefault stops page scroll).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function handler(e: WheelEvent) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      // container is non-null here: we checked above and the closure captures
      // the same reference.
      const minZoom = getMinZoom(container!.clientHeight, imageHeight);
      setView((v) => applyZoomFactor(v, factor, minZoom));
    }
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, [imageHeight]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setView((v) => panBy(v, dx, dy));
  }, []);

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const minZoom = getMinZoom(containerSize.height, imageHeight);
      const panStep = e.shiftKey ? 0.025 : 0.1;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setView((v) => applyZoomFactor(v, 1.1, minZoom));
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setView((v) => applyZoomFactor(v, 0.9, minZoom));
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
            ? containerSize.width * panStep
            : e.key === "ArrowRight"
              ? -containerSize.width * panStep
              : 0;
        const dy =
          e.key === "ArrowUp"
            ? containerSize.height * panStep
            : e.key === "ArrowDown"
              ? -containerSize.height * panStep
              : 0;
        setView((v) => panBy(v, dx, dy));
      }
    },
    [containerSize.width, containerSize.height, imageHeight]
  );

  return {
    containerRef,
    containerSize,
    view,
    setView,
    isDragging: draggingRef,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onKeyDown },
  };
}
