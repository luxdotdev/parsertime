import type { MapTransform } from "@/lib/map-calibration/types";

export type Tool = "select" | "pen" | "arrow" | "eraser";

export type Point = { x: number; y: number };

export type PenStroke = {
  id: string;
  type: "pen";
  points: Point[];
  color: string;
  width: number;
};

export type ArrowStroke = {
  id: string;
  type: "arrow";
  start: Point;
  end: Point;
  color: string;
  width: number;
};

export type DrawingElement = PenStroke | ArrowStroke;

export type PlacedHero = {
  id: string;
  heroName: string;
  team: 1 | 2;
  x: number;
  y: number;
};

export type CanvasState = {
  selectedMap: string | null;
  selectedSubMap: string | null;
  mapTransform: MapTransform | null;
  mapImageUrl: string | null;
  mapImageWidth: number;
  mapImageHeight: number;
  heroes: PlacedHero[];
  drawings: DrawingElement[];
  undoStack: DrawingElement[][];
  redoStack: DrawingElement[][];
  activeTool: Tool;
  strokeColor: string;
  strokeWidth: number;
  view: { offsetX: number; offsetY: number; zoom: number };
};
