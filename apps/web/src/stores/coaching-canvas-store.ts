import type {
  CanvasState,
  DrawingElement,
  PlacedHero,
  Point,
  Tool,
} from "@/lib/coaching/types";
import type { MapTransform } from "@/lib/map-calibration/types";
import { createStore } from "@xstate/store";

const STORAGE_KEY = "parsertime:coaching-canvas";
const STORAGE_VERSION = 1;
const THROTTLE_MS = 500;

type PersistedState = {
  version: number;
  selectedMap: string | null;
  selectedSubMap: string | null;
  mapTransform: MapTransform | null;
  mapImageWidth: number;
  mapImageHeight: number;
  heroes: PlacedHero[];
  drawings: DrawingElement[];
  activeTool: Tool;
  strokeColor: string;
  strokeWidth: number;
};

function getInitialContext(): CanvasState {
  return {
    selectedMap: null,
    selectedSubMap: null,
    mapTransform: null,
    mapImageUrl: null,
    mapImageWidth: 0,
    mapImageHeight: 0,
    heroes: [],
    drawings: [],
    undoStack: [],
    redoStack: [],
    activeTool: "select",
    strokeColor: "var(--team-1-off)",
    strokeWidth: 3,
    view: { offsetX: 0, offsetY: 0, zoom: 1 },
  };
}

export const coachingCanvasStore = createStore({
  context: getInitialContext() satisfies CanvasState,
  on: {
    hydrate: (
      context: CanvasState,
      event: {
        selectedMap: string | null;
        selectedSubMap: string | null;
        mapTransform: MapTransform | null;
        mapImageUrl: string | null;
        mapImageWidth: number;
        mapImageHeight: number;
        heroes: PlacedHero[];
        drawings: DrawingElement[];
        activeTool: Tool;
        strokeColor: string;
        strokeWidth: number;
      }
    ): CanvasState => ({
      ...context,
      selectedMap: event.selectedMap,
      selectedSubMap: event.selectedSubMap,
      mapTransform: event.mapTransform,
      mapImageUrl: event.mapImageUrl,
      mapImageWidth: event.mapImageWidth,
      mapImageHeight: event.mapImageHeight,
      heroes: event.heroes,
      drawings: event.drawings,
      activeTool: event.activeTool,
      strokeColor: event.strokeColor,
      strokeWidth: event.strokeWidth,
    }),

    selectMap: (
      context: CanvasState,
      event: {
        map: string;
        subMap: string | null;
        transform: MapTransform | null;
        imageUrl: string | null;
        imageWidth: number;
        imageHeight: number;
      }
    ): CanvasState => ({
      ...context,
      selectedMap: event.map,
      selectedSubMap: event.subMap,
      mapTransform: event.transform,
      mapImageUrl: event.imageUrl,
      mapImageWidth: event.imageWidth,
      mapImageHeight: event.imageHeight,
      heroes: [],
      drawings: [],
      undoStack: [],
      redoStack: [],
      view: { offsetX: 0, offsetY: 0, zoom: 1 },
    }),

    addHero: (
      context: CanvasState,
      event: { hero: PlacedHero }
    ): CanvasState => ({
      ...context,
      heroes: [...context.heroes, event.hero],
    }),

    moveHero: (
      context: CanvasState,
      event: { id: string; x: number; y: number }
    ): CanvasState => ({
      ...context,
      heroes: context.heroes.map((h) =>
        h.id === event.id ? { ...h, x: event.x, y: event.y } : h
      ),
    }),

    removeHero: (context: CanvasState, event: { id: string }): CanvasState => ({
      ...context,
      heroes: context.heroes.filter((h) => h.id !== event.id),
    }),

    addDrawing: (
      context: CanvasState,
      event: { drawing: DrawingElement }
    ): CanvasState => ({
      ...context,
      drawings: [...context.drawings, event.drawing],
      undoStack: [...context.undoStack, context.drawings],
      redoStack: [],
    }),

    undo: (context: CanvasState): CanvasState => {
      if (context.undoStack.length === 0) return context;
      const previous = context.undoStack[context.undoStack.length - 1];
      return {
        ...context,
        drawings: previous,
        undoStack: context.undoStack.slice(0, -1),
        redoStack: [...context.redoStack, context.drawings],
      };
    },

    redo: (context: CanvasState): CanvasState => {
      if (context.redoStack.length === 0) return context;
      const next = context.redoStack[context.redoStack.length - 1];
      return {
        ...context,
        drawings: next,
        redoStack: context.redoStack.slice(0, -1),
        undoStack: [...context.undoStack, context.drawings],
      };
    },

    eraseAt: (
      context: CanvasState,
      event: { point: Point; radius: number }
    ): CanvasState => {
      const filtered = context.drawings.filter(
        (d) => !isDrawingNearPoint(d, event.point, event.radius)
      );
      if (filtered.length === context.drawings.length) return context;
      return {
        ...context,
        drawings: filtered,
        undoStack: [...context.undoStack, context.drawings],
        redoStack: [],
      };
    },

    setTool: (context: CanvasState, event: { tool: Tool }): CanvasState => ({
      ...context,
      activeTool: event.tool,
    }),

    setStrokeColor: (
      context: CanvasState,
      event: { color: string }
    ): CanvasState => ({
      ...context,
      strokeColor: event.color,
    }),

    setStrokeWidth: (
      context: CanvasState,
      event: { width: number }
    ): CanvasState => ({
      ...context,
      strokeWidth: event.width,
    }),

    setView: (
      context: CanvasState,
      event: { offsetX: number; offsetY: number; zoom: number }
    ): CanvasState => ({
      ...context,
      view: {
        offsetX: event.offsetX,
        offsetY: event.offsetY,
        zoom: event.zoom,
      },
    }),

    setMapImageUrl: (
      context: CanvasState,
      event: { url: string }
    ): CanvasState => ({
      ...context,
      mapImageUrl: event.url,
    }),

    reset: (context: CanvasState): CanvasState => ({
      ...context,
      heroes: [],
      drawings: [],
      undoStack: [],
      redoStack: [],
    }),
  },
});

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.version === STORAGE_VERSION && parsed.selectedMap != null) {
        coachingCanvasStore.send({
          type: "hydrate",
          selectedMap: parsed.selectedMap,
          selectedSubMap: parsed.selectedSubMap ?? null,
          mapTransform: parsed.mapTransform ?? null,
          mapImageUrl: null,
          mapImageWidth: parsed.mapImageWidth ?? 0,
          mapImageHeight: parsed.mapImageHeight ?? 0,
          heroes: parsed.heroes ?? [],
          drawings: parsed.drawings ?? [],
          activeTool: parsed.activeTool ?? "select",
          strokeColor: parsed.strokeColor ?? "var(--team-1-off)",
          strokeWidth: parsed.strokeWidth ?? 3,
        });
      }
    }
  } catch {
    // Ignore hydration errors
  }

  let timeout: ReturnType<typeof setTimeout> | null = null;
  coachingCanvasStore.subscribe((snapshot) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      try {
        const ctx = snapshot.context;
        const persisted: PersistedState = {
          version: STORAGE_VERSION,
          selectedMap: ctx.selectedMap,
          selectedSubMap: ctx.selectedSubMap,
          mapTransform: ctx.mapTransform,
          mapImageWidth: ctx.mapImageWidth,
          mapImageHeight: ctx.mapImageHeight,
          heroes: ctx.heroes,
          drawings: ctx.drawings,
          activeTool: ctx.activeTool,
          strokeColor: ctx.strokeColor,
          strokeWidth: ctx.strokeWidth,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      } catch {
        // Ignore storage errors
      }
    }, THROTTLE_MS);
  });
}

export function flushCanvasToLocalStorage() {
  try {
    const ctx = coachingCanvasStore.getSnapshot().context;
    const persisted: PersistedState = {
      version: STORAGE_VERSION,
      selectedMap: ctx.selectedMap,
      selectedSubMap: ctx.selectedSubMap,
      mapTransform: ctx.mapTransform,
      mapImageWidth: ctx.mapImageWidth,
      mapImageHeight: ctx.mapImageHeight,
      heroes: ctx.heroes,
      drawings: ctx.drawings,
      activeTool: ctx.activeTool,
      strokeColor: ctx.strokeColor,
      strokeWidth: ctx.strokeWidth,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Ignore storage errors
  }
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq)
  );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function isDrawingNearPoint(
  d: DrawingElement,
  point: Point,
  radius: number
): boolean {
  if (d.type === "arrow") {
    return distToSegment(point, d.start, d.end) <= radius;
  }
  if (d.type === "circle") {
    const dist = Math.hypot(point.x - d.center.x, point.y - d.center.y);
    return Math.abs(dist - d.radius) <= radius;
  }
  for (let i = 0; i < d.points.length - 1; i++) {
    if (distToSegment(point, d.points[i], d.points[i + 1]) <= radius) {
      return true;
    }
  }
  return false;
}
