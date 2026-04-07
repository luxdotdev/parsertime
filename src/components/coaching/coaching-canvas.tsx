"use client";

import { CanvasRenderer } from "@/components/coaching/canvas-renderer";
import { CanvasToolbar } from "@/components/coaching/canvas-toolbar";
import { HeroSidebar } from "@/components/coaching/hero-sidebar";
import { HeroToken } from "@/components/coaching/hero-token";
import { MapSelector } from "@/components/coaching/map-selector";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { imageToScreen, screenToImage } from "@/lib/coaching/draw-utils";
import type { Point } from "@/lib/coaching/types";
import { coachingCanvasStore } from "@/stores/coaching-canvas-store";
import { useSelector } from "@xstate/store/react";
import type { LoadedCalibration } from "@/lib/map-calibration/load-calibration";
import { toKebabCase } from "@/lib/utils";
import { mapNameToMapTypeMapping } from "@/types/map";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";

export function CoachingCanvas() {
  const heroes = useSelector(coachingCanvasStore, (s) => s.context.heroes);
  const activeTool = useSelector(
    coachingCanvasStore,
    (s) => s.context.activeTool
  );
  const view = useSelector(coachingCanvasStore, (s) => s.context.view);
  const mapImageWidth = useSelector(
    coachingCanvasStore,
    (s) => s.context.mapImageWidth
  );
  const mapImageHeight = useSelector(
    coachingCanvasStore,
    (s) => s.context.mapImageHeight
  );
  const selectedMap = useSelector(
    coachingCanvasStore,
    (s) => s.context.selectedMap
  );
  const mapImageUrl = useSelector(
    coachingCanvasStore,
    (s) => s.context.mapImageUrl
  );
  const selectedSubMap = useSelector(
    coachingCanvasStore,
    (s) => s.context.selectedSubMap
  );

  // Refetch calibration URL when hydrated state has a map but no image URL
  useEffect(() => {
    if (!selectedMap || mapImageUrl) return;

    // For control maps, use the sub-map name for calibration lookup
    const calibrationName =
      selectedSubMap ??
      Object.keys(mapNameToMapTypeMapping).find(
        (name) => toKebabCase(name) === selectedMap
      );

    if (!calibrationName) {
      coachingCanvasStore.send({
        type: "setMapImageUrl",
        url: `/maps/${selectedMap}.webp`,
      });
      return;
    }

    void (async () => {
      try {
        const res = await fetch(
          `/api/coaching/map-calibration?map=${encodeURIComponent(calibrationName)}`
        );
        if (res.ok) {
          const data = (await res.json()) as LoadedCalibration;
          coachingCanvasStore.send({
            type: "setMapImageUrl",
            url: data.imagePresignedUrl,
          });
          return;
        }
      } catch {}
      coachingCanvasStore.send({
        type: "setMapImageUrl",
        url: `/maps/${selectedMap}.webp`,
      });
    })();
  }, [selectedMap, selectedSubMap, mapImageUrl]);

  const [pendingHero, setPendingHero] = useState<{
    heroName: string;
    team: 1 | 2;
  } | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const updateCanvasSize = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    canvasContainerRef.current = node;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleHeroSelect = useCallback((heroName: string, team: 1 | 2) => {
    setPendingHero({ heroName, team });
    coachingCanvasStore.send({ type: "setTool", tool: "select" });
  }, []);

  const handleCanvasClick = useCallback(
    (imagePoint: Point) => {
      if (!pendingHero) return;
      coachingCanvasStore.send({
        type: "addHero",
        hero: {
          id: nanoid(),
          heroName: pendingHero.heroName,
          team: pendingHero.team,
          x: imagePoint.x,
          y: imagePoint.y,
        },
      });
      setPendingHero(null);
    },
    [pendingHero]
  );

  const handleHeroDrag = useCallback(
    (id: string, screenX: number, screenY: number) => {
      const container = canvasContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const imgPoint = screenToImage(
        screenX - rect.left,
        screenY - rect.top,
        canvasSize.width,
        canvasSize.height,
        mapImageWidth,
        mapImageHeight,
        view
      );
      coachingCanvasStore.send({
        type: "moveHero",
        id,
        x: imgPoint.x,
        y: imgPoint.y,
      });
    },
    [canvasSize, mapImageWidth, mapImageHeight, view]
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-3">
        <MapSelector />
        <CanvasToolbar />
        {pendingHero && (
          <span className="text-muted-foreground text-sm">
            Click on the map to place {pendingHero.heroName}
          </span>
        )}
      </div>
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 rounded-lg border"
      >
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30} collapsible>
          <HeroSidebar
            onHeroSelect={handleHeroSelect}
            pendingHero={pendingHero?.heroName ?? null}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80}>
          <div ref={updateCanvasSize} className="relative h-full w-full">
            <CanvasRenderer
              onCanvasClick={pendingHero ? handleCanvasClick : undefined}
            />
            {selectedMap &&
              heroes.map((hero) => {
                const screen = imageToScreen(
                  hero.x,
                  hero.y,
                  canvasSize.width,
                  canvasSize.height,
                  mapImageWidth,
                  mapImageHeight,
                  view
                );
                return (
                  <HeroToken
                    key={hero.id}
                    hero={hero}
                    screenX={screen.x}
                    screenY={screen.y}
                    zoom={view.zoom}
                    isInteractive={activeTool === "select"}
                    onDrag={(x, y) => handleHeroDrag(hero.id, x, y)}
                    onRemove={() =>
                      coachingCanvasStore.send({
                        type: "removeHero",
                        id: hero.id,
                      })
                    }
                  />
                );
              })}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
